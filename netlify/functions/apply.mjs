import { apply } from '../../worker/api.mjs';
import { createMailEnvironment } from '../../scripts/mail.mjs';

let mailEnvironment;
export default async function handler(request) {
 try {
  mailEnvironment ||= createMailEnvironment(process.env);
  return await apply(request, mailEnvironment);
 } catch {
  return Response.json({ error: 'A levélküldés beállítása hiányos. Kérjük, írj az info@hsa.hu címre.' },
   { status: 503, headers: { 'Cache-Control': 'no-store' } });
 }
}
