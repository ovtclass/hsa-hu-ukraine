import { getStore } from '@netlify/blobs';
import { purgeExpired } from '../../worker/analytics.mjs';

export const config = { schedule: '17 2 * * *' };
export default async function handler(request, context) {
 if (context?.deploy?.context === 'production') {
  const store = getStore({ name: 'analytics-production-v1', region: 'eu-central-1', consistency: 'strong' });
  await purgeExpired(store);
 }
 return new Response(null, { status: 204 });
}
