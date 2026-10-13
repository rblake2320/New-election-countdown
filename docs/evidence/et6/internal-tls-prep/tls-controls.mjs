import { createRequire } from 'node:module';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { connect, checkServerIdentity } from 'node:tls';
import { X509Certificate } from 'node:crypto';
const require = createRequire('/harness/package.json');
const { chromium, firefox, webkit } = require('/harness/node_modules/playwright');
const receipt = { startedAt: new Date().toISOString(), outcome: 'Failed', checks: [] };
const exists = async p => { try { await access(p); return true; } catch { return false; } };
const failure = e => String(e?.message ?? e).slice(0, 3000);
const certificateErrors = {
  chromium: { 'absent-ca': /\bERR_CERT_AUTHORITY_INVALID\b/i, 'trusted-wrong-san': /\bERR_CERT_COMMON_NAME_INVALID\b/i },
  firefox: { 'absent-ca': /\b(?:SEC_ERROR_(?:UNKNOWN_ISSUER|UNTRUSTED_ISSUER|UNTRUSTED_CERT)|MOZILLA_PKIX_ERROR_SELF_SIGNED_CERT)\b/i, 'trusted-wrong-san': /\bSSL_ERROR_BAD_CERT_DOMAIN\b/i },
  webkit: { 'absent-ca': /(?:Unacceptable TLS certificate|TLS certificate verification failed|SSL peer certificate or SSH remote key was not OK|certificate verify failed)/i, 'trusted-wrong-san': /(?:Unacceptable TLS certificate|TLS certificate verification failed|SSL peer certificate or SSH remote key was not OK|certificate verify failed)/i },
};
let sameLeafCorroboration = false;
async function nodeFetch(url, scenario) {
  const result = { browser: 'node-fetch', scenario, url: url.href, outcome: 'Failed' };
  try {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    result.status = response.status;
    await response.body?.cancel();
    if (scenario !== 'trusted-correct-san') throw new Error('Negative certificate control unexpectedly succeeded');
    if (!response.ok) throw new Error('Trusted Node fetch did not return 2xx');
    result.outcome = 'Worked';
  } catch (error) {
    result.error = failure(error);
    result.causeCode = error?.cause?.code ?? error?.code;
    const allowed = scenario === 'absent-ca'
      ? ['UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT']
      : scenario === 'trusted-wrong-san' ? ['ERR_TLS_CERT_ALTNAME_INVALID'] : [];
    if (allowed.includes(result.causeCode)) result.outcome = 'Worked';
  }
  return result;
}
async function corroborateLeaf(url, fingerprint, wrong) {
  return new Promise(resolve => {
    const result = { browser: 'node-tls-leaf', scenario: wrong ? 'trusted-wrong-san' : 'trusted-correct-san', url: url.href, outcome: 'Failed' };
    let matched = false;
    const socket = connect({ host: url.hostname, port: Number(url.port || 443), servername: url.hostname, rejectUnauthorized: true,
      checkServerIdentity(host, cert) {
        result.presentedFingerprint256 = cert.fingerprint256;
        matched = cert.fingerprint256 === fingerprint;
        if (!matched) return new Error('Presented leaf differs from supplied public leaf');
        return checkServerIdentity(host, cert);
      }
    });
    socket.setTimeout(30000, () => socket.destroy(new Error('TLS control timeout')));
    socket.once('secureConnect', () => {
      if (!wrong && matched && socket.authorized) result.outcome = 'Worked';
      else result.error = 'Unexpected TLS handshake acceptance';
      socket.destroy(); resolve(result);
    });
    socket.once('error', error => {
      result.error = failure(error); result.code = error.code;
      if (wrong && matched && error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') result.outcome = 'Worked';
      resolve(result);
    });
  });
}
function parseBase(name) {
  const u = new URL(process.env[name]);
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash)
    throw new Error(`${name} must be a credential-free HTTPS URL without query or fragment`);
  return u;
}
async function check(engine, name, url, expectation, trusted) {
  let browser, context, temporaryProfile;
  const result = { browser: name, scenario: expectation, url: url.href, outcome: 'Failed' };
  try {
    const options = { headless: true, ignoreHTTPSErrors: false, bypassCSP: false };
    if (name === 'firefox') {
      const profile = trusted ? '/tmp/et6-firefox-profile' : (temporaryProfile = await mkdtemp(join(tmpdir(), 'et6-tls-absent-')));
      context = await engine.launchPersistentContext(profile, options);
      result.profileKind = trusted ? 'prepared-nss' : 'fresh-empty';
    } else {
      browser = await engine.launch({ headless: true });
      context = await browser.newContext({ ignoreHTTPSErrors: false, bypassCSP: false });
    }
    result.browserVersion = (browser ?? context.browser())?.version();
    const page = await context.newPage();
    let response;
    try {
      response = await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (error) {
      result.navigationError = failure(error);
      if (expectation !== 'trusted-correct-san' && certificateErrors[name][expectation].test(result.navigationError)) {
        if (name === 'webkit' && expectation === 'trusted-wrong-san' && !sameLeafCorroboration)
          throw new Error('Generic WebKit certificate error lacks Node same-leaf SAN corroboration');
        result.certificateRejection = true;
        if (name === 'webkit') result.classification = expectation === 'trusted-wrong-san' ? 'generic-certificate-rejection; hostname reason corroborated by Node same-leaf control' : 'generic-certificate-rejection; fresh no-CA container';
        result.outcome = 'Worked';
        return result;
      }
      throw new Error('Navigation failed without the required outcome: ' + result.navigationError);
    }
    if (expectation !== 'trusted-correct-san') throw new Error('Negative certificate control unexpectedly navigated successfully');
    if (!response) throw new Error('Navigation returned no HTTP response');
    result.status = response.status();
    result.finalUrl = page.url();
    result.secureContext = await page.evaluate(() => window.isSecureContext);
    result.securityDetails = await response.securityDetails();
    if (result.status < 200 || result.status >= 400 || !result.secureContext || new URL(result.finalUrl).origin !== url.origin)
      throw new Error('Trusted control requires successful HTTPS response, same origin and secure context');
    result.outcome = 'Worked';
  } catch (error) {
    result.error = failure(error);
  } finally {
    try { await context?.close(); await browser?.close(); }
    catch (error) { result.outcome = 'Failed'; result.cleanupError = failure(error); }
    if (temporaryProfile) await rm(temporaryProfile, { recursive: true, force: true });
  }
  return result;
}
try {
  if (!['true', 'false'].includes(process.env.CA_TRUSTED)) throw new Error('CA_TRUSTED must be exactly true or false');
  const trusted = process.env.CA_TRUSTED === 'true';
  const base = parseBase('BASE');
  const wrong = parseBase('WRONG_BASE');
  if (wrong && wrong.hostname === base.hostname) throw new Error('WRONG_BASE must use a different hostname, resolving to the same TLS fixture');
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('TLS verification bypass forbidden');
  if (trusted ? process.env.NODE_EXTRA_CA_CERTS !== '/run/et6-ca/root.crt' : Boolean(process.env.NODE_EXTRA_CA_CERTS))
    throw new Error('Set NODE_EXTRA_CA_CERTS=/run/et6-ca/root.crt only at trusted process startup; leave unset for absent CA');
  const leaf = new X509Certificate(await readFile('/run/et6-ca/leaf.crt'));
  const from = Date.parse(leaf.validFrom), to = Date.parse(leaf.validTo), now = Date.now();
  receipt.publicLeaf = { fingerprint256: leaf.fingerprint256, subjectAltName: leaf.subjectAltName, validFrom: leaf.validFrom, validTo: leaf.validTo, keyUsage: leaf.keyUsage };
  const hostOptions = { subject: 'never', wildcards: false, partialWildcards: false, multiLabelWildcards: false, singleLabelSubdomains: false };
  if (leaf.subjectAltName !== 'DNS:' + base.hostname || leaf.ca || leaf.checkHost(base.hostname, hostOptions) !== base.hostname || leaf.checkHost(wrong.hostname, hostOptions) !== undefined || from > now || to <= now || to - from > 48 * 3600000 || !leaf.keyUsage?.includes('1.3.6.1.5.5.7.3.1'))
    throw new Error('Leaf must be current, non-CA, <=48h lifetime, serverAuth, matching BASE SAN and excluding WRONG_BASE');
  receipt.caTrusted = trusted;
  receipt.uid = process.getuid?.();
  receipt.home = homedir();
  receipt.playwrightVersion = require('/harness/node_modules/playwright/package.json').version;
  if (receipt.playwrightVersion !== '1.64.0') throw new Error('Requires exact Playwright 1.64.0');
  if (receipt.uid !== 1001 || receipt.home !== '/home/pwuser') throw new Error('Run as pwuser UID1001 with HOME=/home/pwuser');
  const installed = await exists('/usr/local/share/ca-certificates/et6-fixture.crt');
  if (installed !== trusted) throw new Error('CA_TRUSTED disagrees with container trust preparation; use separate fresh containers for absent/trusted controls');
  if (trusted) {
    if (!await exists('/tmp/et6-firefox-profile/cert9.db')) throw new Error('Prepared Firefox NSS profile missing');
    const ca = new X509Certificate(await readFile('/usr/local/share/ca-certificates/et6-fixture.crt'));
    receipt.publicCa = { fingerprint256: ca.fingerprint256, subject: ca.subject, issuer: ca.issuer, validFrom: ca.validFrom, validTo: ca.validTo, ca: ca.ca };
    if (!ca.ca) throw new Error('Installed certificate is not a CA');
  } else if (await exists('/home/pwuser/.pki/nssdb/cert9.db') || await exists('/home/pwuser/.local/share/pki/nssdb/cert9.db')) {
    throw new Error('Absent-CA control requires a fresh container without prepopulated Chromium NSS DB');
  }
  receipt.checks.push(await nodeFetch(base, trusted ? 'trusted-correct-san' : 'absent-ca'));
  if (trusted) {
    receipt.checks.push(await nodeFetch(wrong, 'trusted-wrong-san'));
    const positiveLeaf = await corroborateLeaf(base, leaf.fingerprint256, false);
    const negativeLeaf = await corroborateLeaf(wrong, leaf.fingerprint256, true);
    receipt.checks.push(positiveLeaf, negativeLeaf);
    sameLeafCorroboration = positiveLeaf.outcome === 'Worked' && negativeLeaf.outcome === 'Worked';
  }
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    receipt.checks.push(await check(engine, name, base, trusted ? 'trusted-correct-san' : 'absent-ca', trusted));
    if (trusted) receipt.checks.push(await check(engine, name, wrong, 'trusted-wrong-san', trusted));
  }
  if (receipt.checks.every(c => c.outcome === 'Worked')) receipt.outcome = 'Worked';
} catch (error) { receipt.error = failure(error); }
receipt.finishedAt = new Date().toISOString();
console.log(JSON.stringify(receipt, null, 2));
process.exitCode = receipt.outcome === 'Worked' ? 0 : 1;
