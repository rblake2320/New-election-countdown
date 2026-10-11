import ts from 'typescript';
import path from 'node:path';
import { writeFileSync } from 'node:fs';

// Check the real project graph; only the client diagnostic boundary is ratcheted.
// Global/configuration errors also fail closed. Server/shared errors remain reported.
const root = process.cwd();
const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
if (!configPath) throw new Error('Missing tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, root,
  { incremental: false, noEmit: true });
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = [config.error, ...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
  .filter(Boolean).filter(d => d.category === ts.DiagnosticCategory.Error);
const format = ds => ts.formatDiagnostics(ds, {
  getCanonicalFileName: f => f, getCurrentDirectory: () => root,
  getNewLine: () => '\n',
});
writeFileSync('typecheck.txt', format(diagnostics));
const gated = diagnostics.filter(d => {
  if (!d.file) return true;
  const relative = path.relative(root, d.file.fileName).replaceAll('\\', '/');
  return relative.startsWith('client/src/');
});
console.log(`Client/global errors: ${gated.length}; whole-project errors: ${diagnostics.length}. Full report: typecheck.txt`);
if (gated.length) console.error(format(gated));
process.exitCode = gated.length ? 1 : 0;
