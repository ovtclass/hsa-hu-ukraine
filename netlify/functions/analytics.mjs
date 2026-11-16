import { getStore } from '@netlify/blobs';
import { eventKey, pageviewKey } from '../../worker/analytics.mjs';

export const config = { rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
export async function collect(request, context, dependencies = {}) {
 const reply = (status) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
 if (request.method !== 'POST') return reply(405);
 const origin = new URL(request.url).origin;
 if (request.headers.get('origin') !== origin || request.headers.get('content-type') !== 'application/json') return reply(403);
 if (context?.deploy?.context !== 'production') return reply(204);
 if (Number(request.headers.get('content-length')) > 1024) return reply(413);
 try {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 1024) return reply(413);
  const data = JSON.parse(raw);
  if (!['/', '/cz-pl'].includes(data.path)) return reply(400);
  const basic = data.kind === 'pageview';
  if (!basic && (data.consent !== true || ![undefined, 'detail'].includes(data.kind))) return reply(400);
  const ua = request.headers.get('user-agent') || '';
  if (/bot|crawler|spider|headless/i.test(ua)) return reply(204);
  if (!basic && (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1')) return reply(204);
  const secret = dependencies.secret ?? process.env.ANALYTICS_HASH_SECRET;
  if (!basic && (!secret || secret.length < 32)) return reply(503);
  const store = dependencies.store || getStore({ name: 'analytics-production-v1', region: 'eu-central-1', consistency: 'strong' });
  const key = basic ? pageviewKey(data.path) : eventKey({ kind: data.kind, path: data.path, ip: context.ip, ua, country: context.geo?.country?.code, referrer: String(data.referrer || '').slice(0, 500), origin, secret });
  await store.set(key, '');
  return reply(204);
 } catch { return reply(503); }
}
export default (request, context) => collect(request, context);
