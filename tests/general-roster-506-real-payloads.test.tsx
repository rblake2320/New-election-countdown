/**
 * Durable regression for D's 506 ACTUAL /api/elections/:id/general-candidates responses (production image
 * 7129b045, run 93520-1f736ce3, after the 36-profile / 87-fact source increment, postimage 769c35bb).
 * Fixture: tests/fixtures/general-roster-506/rosters.json.gz = [{ electionId, payload }] (D's parsed payloads,
 * D's wrapper fields dropped). Byte pins below fail if the fixture is edited. Source file D:...increment-rosters.json
 * had sha256 47b2c57a...f3b (2,151,308 bytes); it is recorded here for provenance only and is not read.
 * The real GeneralRoster component and the real qualification code render each payload through msw.
 * (The 36 new profiles are OFFICIAL general-list additions, not FEC-only: C, nonce C-506ACK.)
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { render, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GeneralRoster } from '../client/src/components/general-roster';
import { officialListIds, rowQualification } from '../client/src/lib/candidate-qualification';

const GZ_SHA256 = '10fd3a1df960f8e3800f1a8c85de49faed7d42d40c71df134bb9b13121039cc9';
const JSON_SHA256 = '2e41a953e27b9c74711315a624f9bf51b21b53a2cf52dc1390ea1664e43d914b';
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

const gz = readFileSync(resolve(process.cwd(), 'tests/fixtures/general-roster-506/rosters.json.gz'));
const slim = gunzipSync(gz);
const rosters: { electionId: number; payload: any }[] = JSON.parse(slim.toString('utf8'));

let current: any = null;
const server = setupServer(http.get('/api/elections/:id/general-candidates', () => HttpResponse.json(current)));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => cleanup());
afterAll(() => server.close());

describe('general-roster fixture bytes', () => {
  it('are exactly the pinned bytes (a hand edit fails here first)', () => {
    expect(sha(gz)).toBe(GZ_SHA256);
    expect(sha(slim)).toBe(JSON_SHA256);
    expect(rosters).toHaveLength(506);
    expect(new Set(rosters.map(r => r.electionId)).size).toBe(506);
    const tally = { sourced: 0, not_recorded: 0, not_applicable: 0 } as Record<string, number>;
    rosters.forEach(r => { tally[r.payload.status]++; });
    expect(tally).toEqual({ sourced: 498, not_recorded: 2, not_applicable: 6 });
    expect(rosters.reduce((n, r) => n + r.payload.candidates.length, 0)).toBeGreaterThan(1000);
  });
});

describe('506 real rosters through the real components', () => {
  it('every roster renders honestly: names, rows, sources, labels; unknown/not-applicable stated or hidden', { timeout: 280000 }, async () => {
    const problems: string[] = [];
    const tally = { listed: 0, notRecorded: 0, hidden: 0 };
    for (const { electionId, payload: p } of rosters) {
      current = p;
      const { container } = render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <GeneralRoster electionId={electionId} />
        </QueryClientProvider>,
      );
      if (p.status === 'not_applicable') {
        await new Promise(r => setTimeout(r, 40));
        if (container.textContent?.trim()) problems.push(`${electionId}: not_applicable rendered text`);
        tally.hidden++; cleanup(); continue;
      }
      await waitFor(() => { if (!container.querySelector('[data-testid=general-roster]')) throw new Error('pending'); }, { timeout: 5000 })
        .catch(() => problems.push(`${electionId}: roster card missing (${p.status})`));
      const text = container.textContent ?? '';
      if (/undefined|NaN|\bnull\b/.test(text)) problems.push(`${electionId}: bad token in text`);
      for (const a of Array.from(container.querySelectorAll('a'))) if (!/^https?:/.test(a.getAttribute('href') ?? '')) problems.push(`${electionId}: non-http link`);
      if (p.status === 'sourced') {
        const rows = container.querySelectorAll('ul[aria-label] > li');
        if (rows.length !== p.candidates.length) problems.push(`${electionId}: ${rows.length} rows vs ${p.candidates.length}`);
        for (const c of p.candidates) if (!text.includes(c.name)) problems.push(`${electionId}: name missing ${c.name}`);
        if (!container.querySelector('[data-testid=general-roster-sources]')) problems.push(`${electionId}: no source line`);
        const ids = officialListIds(p);
        for (const c of p.candidates) {
          const label = rowQualification(c, p);
          if (!ids.has(c.id)) problems.push(`${electionId}: roster id missing from official ids`);
          if (!label) problems.push(`${electionId}: no qualification label for ${c.name}`);
          else if (/FEC registration/.test(label)) problems.push(`${electionId}: official-list candidate labelled FEC-only (${c.name})`);
        }
        tally.listed++;
      } else {
        if (!container.querySelector('[data-testid=general-roster-empty]') || container.querySelector('ul[aria-label]')) problems.push(`${electionId}: ${p.status} not stated as unrecorded`);
        tally.notRecorded++;
      }
      cleanup();
    }
    expect(problems).toEqual([]);
    expect(tally).toEqual({ listed: 498, notRecorded: 2, hidden: 6 });
  });

  it('control: a tampered payload is caught (bad token in a candidate name)', async () => {
    const first = rosters.find(r => r.payload.status === 'sourced' && r.payload.candidates.length)!;
    current = { ...first.payload, candidates: [{ ...first.payload.candidates[0], name: 'NaN Undefined' }, ...first.payload.candidates.slice(1)] };
    const { container } = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><GeneralRoster electionId={first.electionId} /></QueryClientProvider>);
    await waitFor(() => expect(container.querySelector('[data-testid=general-roster]')).not.toBeNull());
    expect(/undefined|NaN|\bnull\b/.test(container.textContent ?? '')).toBe(true);
  });
});
