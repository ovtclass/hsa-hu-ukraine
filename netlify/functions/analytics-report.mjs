import { getStore } from '@netlify/blobs';
import { authorized, summarize } from '../../worker/analytics.mjs';
import { dashboard } from '../../worker/analytics-dashboard.mjs';

export const config = { path: '/statisztika', rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
export default async function handler(request, context) {
 const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'" };
 if (request.method !== 'GET') return new Response(null, { status: 405, headers });
 if (!authorized(request, process.env.ANALYTICS_ADMIN_PASSWORD)) return new Response('A statisztika megtekintéséhez jelentkezz be.', { status: 401, headers: { ...headers, 'WWW-Authenticate': 'Basic realm="HSA statisztika", charset="UTF-8"' } });
 const url = new URL(request.url);
 if (url.searchParams.get('format') !== 'json') return new Response(dashboard, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
 if (context?.deploy?.context !== 'production') return Response.json({ error: 'A statisztika csak az éles oldalon érhető el.' }, { status: 503, headers });
 const days = Number(url.searchParams.get('days') || 7);
 if (![1, 7, 30].includes(days)) return Response.json({ error: 'Érvénytelen időszak.' }, { status: 400, headers });
 try {
  const store = getStore({ name: 'analytics-production-v1', region: 'eu-central-1', consistency: 'strong' });
  return Response.json(await summarize(store, days), { headers });
 } catch { return Response.json({ error: 'A statisztika nem tölthető be. Próbáld újra később.' }, { status: 503, headers }); }
}
