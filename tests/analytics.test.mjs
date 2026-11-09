import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { eventKey, authorized, summarize, purgeExpired, deviceInfo, sourceHost, submissionKey } from '../worker/analytics.mjs';
import collect from '../netlify/functions/analytics.mjs';
import report from '../netlify/functions/analytics-report.mjs';

const now = new Date('2026-11-09T12:00:00Z');
const input = { ip: '192.0.2.1', ua: 'Mozilla/5.0 Android Mobile Chrome/100.0', country: 'HU', referrer: 'https://google.com/search?q=private', origin: 'https://example.com', secret: 'x'.repeat(64), now };
function decode(key) { return JSON.parse(Buffer.from(key.split('/')[1], 'base64url').toString()); }
function fakeStore(keys) {
 const totals = new Map();
 return { totals, async get(key) { return totals.get(key) || null; }, async setJSON(key, value) { if (!totals.has(key)) { totals.set(key, value); keys.push(key); } }, deleted: [], async *list({ prefix = '' } = {}) { const matching = [...keys].filter(key => key.startsWith(prefix)); for (let i = 0; i < matching.length; i += 2) yield { blobs: matching.slice(i, i + 2).map(key => ({ key })) }; }, async delete(key) { this.deleted.push(key); const index = keys.indexOf(key); if (index >= 0) keys.splice(index, 1); } };
}
test('events persist only coarse data and rotate daily visitor pseudonyms', () => {
 const a = eventKey(input), b = eventKey(input);
 assert.notEqual(a, b);
 const data = decode(a);
 assert.equal(data.visitor, decode(b).visitor);
 assert.notEqual(data.visitor, decode(eventKey({ ...input, now: new Date('2026-11-10T00:00:00Z') })).visitor);
 assert.deepEqual(Object.keys(data).sort(), ['browser', 'country', 'device', 'source', 'visitor']);
 assert.equal(data.source, 'google.com'); assert.equal(data.device, 'Mobil'); assert.equal(data.browser, 'Chrome');
 assert.ok(!JSON.stringify(data).includes(input.ip));
 assert.ok(!JSON.stringify(data).includes('private'));
 assert.ok(a.length < 600);
 assert.equal(sourceHost('https://example.com/secret?q=1', input.origin), 'Közvetlen / ismeretlen');
 assert.equal(deviceInfo('Mozilla iPad Safari/100').device, 'Tablet');
 assert.equal(deviceInfo('Chrome/100 Edg/100').browser, 'Edge');
});
test('paged reports count concurrent events, deduplicate only within a day and bound work', async () => {
 const keys = [eventKey(input), eventKey(input), eventKey({ ...input, now: new Date('2026-11-08T10:00:00Z') }), eventKey({ ...input, now: new Date('2026-09-01T00:00:00Z') })];
 const result = await summarize(fakeStore(keys), 7, now);
 assert.equal(result.pageviews, 3); assert.equal(result.visitorDays, 2);
 assert.equal(result.days['2026-11-09'].visitors, 1); assert.equal(result.sources['google.com'], 3);
 const limited = await summarize(fakeStore(keys), 7, now, 2);
 assert.equal(limited.pageviews, 2); assert.equal(limited.truncated, true);
});
test('retention cleanup deletes expired keys only and observes its batch limit', async () => {
 const store = fakeStore(['2026-10-01/a', '2026-10-02/b', '2026-10-11/c', '2026-11-09/d']);
 assert.equal(await purgeExpired(store, now, 1), 1);
 assert.deepEqual(store.deleted, ['2026-10-01/a']);
 const all = fakeStore(['2026-10-01/a', '2026-10-02/b', '2026-10-11/c']);
 assert.equal(await purgeExpired(all, now), 2);
});

test('daily compaction preserves all-time views and submissions across partial deletion and reruns', async () => {
 const old = new Date('2026-10-01T10:00:00Z');
 const store = fakeStore([eventKey({ ...input, now: old }), eventKey({ ...input, now: old }), submissionKey(old), eventKey(input), submissionKey(now)]);
 assert.deepEqual((await summarize(store, 30, now)).allTime, { pageviews: 3, submissions: 2 });
 await purgeExpired(store, now, 1);
 assert.deepEqual(store.totals.get('totals/2026-10-01'), { pageviews: 2, submissions: 1 });
 assert.deepEqual((await summarize(store, 30, now)).allTime, { pageviews: 3, submissions: 2 });
 await purgeExpired(store, now);
 await purgeExpired(store, now);
 const report = await summarize(store, 30, now);
 assert.deepEqual(report.allTime, { pageviews: 3, submissions: 2 });
 assert.equal(report.pageviews, 1); assert.equal(report.submissions, 1);
});
test('reports fail closed without credentials and collection rejects cross-site calls', async () => {
 const password = 's'.repeat(32);
 const request = value => new Request('https://example.com/statisztika', { headers: { Authorization: 'Basic ' + Buffer.from(value).toString('base64') } });
 assert.equal(authorized(request('admin:' + password), password), true);
 assert.equal(authorized(request('admin:wrong'), password), false);
 assert.equal(authorized(request('admin:' + password), ''), false);
 assert.equal((await report(new Request('https://example.com/statisztika'))).status, 401);
 assert.equal((await collect(new Request('https://example.com/analytics', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }), {})).status, 403);
});
test('browser tracker sends nothing before consent, respects DNT and strips referrer details', async () => {
 const script = await readFile(new URL('../dist/analytics.js', import.meta.url), 'utf8');
 function run(navigator = {}, pathname = '/') {
  let handler; const calls = [];
  vm.runInNewContext(script, { window: { addEventListener: (_, callback) => { handler = callback; } }, navigator, location: { pathname }, document: { referrer: 'https://google.com/search?q=private#name' }, URL, fetch: (...args) => { calls.push(args); return Promise.resolve(); } });
  return { calls, consent: value => handler({ detail: value }) };
 }
 const tracker = run(); assert.equal(tracker.calls.length, 0);
 tracker.consent(false); assert.equal(tracker.calls.length, 0);
 tracker.consent(true); tracker.consent(true); assert.equal(tracker.calls.length, 1);
 assert.equal(JSON.parse(tracker.calls[0][1].body).referrer, 'https://google.com');
 const dnt = run({ doNotTrack: '1' }); dnt.consent(true); assert.equal(dnt.calls.length, 0);
 const gpc = run({ globalPrivacyControl: true }); gpc.consent(true); assert.equal(gpc.calls.length, 0);
 const uk = run({}, '/ua'); uk.consent(true); assert.equal(uk.calls.length, 1);
 assert.equal(JSON.parse(uk.calls[0][1].body).path, '/');
});
