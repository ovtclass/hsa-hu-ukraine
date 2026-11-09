import { createHmac, randomUUID, timingSafeEqual, createHash } from 'node:crypto';

export const RETENTION_DAYS = 30;
export const day = (now = new Date()) => now.toISOString().slice(0, 10);
export function cutoff(now = new Date()) {
 return day(new Date(Date.parse(`${day(now)}T00:00:00Z`) - (RETENTION_DAYS - 1) * 86400000));
}
export function deviceInfo(ua) {
 const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\/|FxiOS\//.test(ua) ? 'Firefox' : /Chrome\/|CriOS\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Egyéb';
 const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? 'Tablet' : /Mobi|iPhone/i.test(ua) ? 'Mobil' : 'Asztali';
 return { browser, device };
}
export function sourceHost(referrer, origin) {
 try {
  const url = new URL(referrer);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin === origin) return 'Közvetlen / ismeretlen';
  return url.hostname.toLowerCase().slice(0, 120);
 } catch { return 'Közvetlen / ismeretlen'; }
}
export function eventKey({ ip, ua, country, referrer, origin, secret, now = new Date() }) {
 const date = day(now);
 const { browser, device } = deviceInfo(ua);
 // Daily pseudonym: raw IP and full User-Agent are never persisted.
 const visitor = ip ? createHmac('sha256', secret).update(JSON.stringify([date, ip, browser, device])).digest('hex').slice(0, 32) : randomUUID();
 const data = { visitor, browser, device, country: /^[A-Z]{2}$/.test(country || '') ? country : 'Ismeretlen', source: sourceHost(referrer, origin) };
 return `${date}/${Buffer.from(JSON.stringify(data)).toString('base64url')}/${randomUUID()}`;
}
export function authorized(request, password) {
 if (!password || password.length < 24) return false;
 try {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  const credentials = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(credentials), digest(`admin:${password}`));
 } catch { return false; }
}
export function submissionKey(now = new Date()) {
 return `${day(now)}/${Buffer.from(JSON.stringify({ kind: 'submission' })).toString('base64url')}/${randomUUID()}`;
}
function decode(key) {
 try { return JSON.parse(Buffer.from(key.split('/')[1], 'base64url').toString('utf8')); } catch { return null; }
}
export async function summarize(store, days, now = new Date(), maxEvents = 50000) {
 const today = day(now);
 const since = day(new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86400000));
 const summary = { pageviews: 0, submissions: 0, visitorDays: 0, allTime: { pageviews: 0, submissions: 0 }, since, until: today, truncated: false, days: {}, countries: {}, devices: {}, browsers: {}, sources: {} };
 const rolledUp = new Set();
 for await (const page of store.list({ prefix: 'totals/', paginate: true })) {
  for (const { key } of page.blobs) {
   const totals = await store.get(key, { type: 'json' });
   if (!totals) continue;
   rolledUp.add(key.slice(7));
   summary.allTime.pageviews += totals.pageviews;
   summary.allTime.submissions += totals.submissions;
  }
 }
 const visitors = new Set(), dailyVisitors = new Map();
 let scanned = 0;
 for await (const page of store.list({ paginate: true })) {
  for (const { key } of page.blobs) {
   if (!/^\d{4}-\d{2}-\d{2}\//.test(key)) continue;
   const date = key.slice(0, 10);
   if (date > today || rolledUp.has(date)) continue;
   if (scanned++ >= maxEvents) { summary.truncated = true; break; }
   const event = decode(key);
   if (!event || (event.kind !== 'submission' && typeof event.visitor !== 'string')) continue;
   const field = event.kind === 'submission' ? 'submissions' : 'pageviews';
   summary.allTime[field]++;
   if (date < since) continue;
   const daily = summary.days[date] ||= { pageviews: 0, submissions: 0, visitors: 0 };
   summary[field]++; daily[field]++;
   if (field === 'submissions') continue;
   if (!dailyVisitors.has(date)) dailyVisitors.set(date, new Set());
   dailyVisitors.get(date).add(event.visitor); visitors.add(`${date}/${event.visitor}`);
   for (const [target, prop] of [['countries', 'country'], ['devices', 'device'], ['browsers', 'browser'], ['sources', 'source']]) {
    const value = String(event[prop] || 'Ismeretlen');
    Object.defineProperty(summary[target], value, { value: (Object.hasOwn(summary[target], value) ? summary[target][value] : 0) + 1, writable: true, enumerable: true, configurable: true });
   }
  }
  if (summary.truncated) break;
 }
 for (let date = since; date <= today; date = day(new Date(Date.parse(`${date}T00:00:00Z`) + 86400000))) {
  summary.days[date] ||= { pageviews: 0, submissions: 0, visitors: 0 };
  summary.days[date].visitors = dailyVisitors.get(date)?.size || 0;
 }
 summary.visitorDays = visitors.size;
 return summary;
}

export async function purgeExpired(store, now = new Date(), limit = 2000) {
 const oldest = cutoff(now), dates = new Set();
 for await (const page of store.list({ paginate: true })) {
  for (const { key } of page.blobs) if (/^\d{4}-\d{2}-\d{2}\//.test(key) && key.slice(0, 10) < oldest) dates.add(key.slice(0, 10));
 }
 let deleted = 0;
 for (const date of [...dates].sort()) {
  let totals = await store.get(`totals/${date}`, { type: 'json' });
  if (!totals) {
   totals = { pageviews: 0, submissions: 0 };
   for await (const page of store.list({ prefix: `${date}/`, paginate: true })) {
    for (const { key } of page.blobs) {
     const event = decode(key);
     if (event?.kind === 'submission') totals.submissions++;
     else if (typeof event?.visitor === 'string') totals.pageviews++;
    }
   }
   // Closed days only. A durable, create-only checkpoint precedes any deletion.
   await store.setJSON(`totals/${date}`, totals, { onlyIfNew: true });
   if (!await store.get(`totals/${date}`, { type: 'json' })) throw new Error('Rollup checkpoint missing');
  }
  for await (const page of store.list({ prefix: `${date}/`, paginate: true })) {
   const keys = page.blobs.slice(0, limit - deleted);
   for (let i = 0; i < keys.length; i += 20) await Promise.all(keys.slice(i, i + 20).map(({ key }) => store.delete(key)));
   deleted += keys.length;
   if (deleted >= limit) return deleted;
  }
 }
 return deleted;
}
