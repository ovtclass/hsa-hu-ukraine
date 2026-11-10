import { getStore } from '@netlify/blobs';
import { submissionKey } from '../../worker/analytics.mjs';
import { apply } from '../../worker/api.mjs';
import { createMailEnvironment } from '../../scripts/mail.mjs';

let mailEnvironment;
export default async function handler(request, context) {
 try {
  try { mailEnvironment ||= createMailEnvironment(process.env); } catch { mailEnvironment = {}; }
  const production = context?.deploy?.context === 'production';
  const applications = getStore({ name: production ? 'applications-production-v1' : 'applications-preview-' + (context?.deploy?.id || 'local'), region: 'eu-central-1', consistency: 'strong' });
  const response = await apply(request, { ...mailEnvironment, SAVE_APPLICATION: record => applications.setJSON(record.id, record) });
  if (response.ok && context?.deploy?.context === 'production') {
   try {
    const store = getStore({ name: 'analytics-production-v1', region: 'eu-central-1', consistency: 'strong' });
    await store.set(submissionKey(), '');
   } catch { console.error('Successful application could not be recorded in statistics.'); }
  }
  return response;
 } catch {
  return Response.json({ error: 'A levélküldés beállítása hiányos. Kérjük, írj az info@hsa.hu címre.' },
   { status: 503, headers: { 'Cache-Control': 'no-store' } });
 }
}
