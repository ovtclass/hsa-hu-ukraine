import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { createMailEnvironment } from '../scripts/mail.mjs';
import { apply } from '../worker/api.mjs';
import { applicationEmail } from '../worker/application-email.mjs';

const settings = { MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp.example.com', SMTP_USER: 'user', SMTP_PASS: 'test-password', APPLICATION_FROM: 'sender@example.com' };
function request({ consent = true, attachment = true } = {}) {
 const form = new FormData();
 for (const [key, value] of Object.entries({ name: 'Teszt Elek', email: 'applicant@example.com', phone: '+3612345678', jobs: 'Gyöngyös - Operátor' })) form.append(key, value);
 if (consent) form.append('consent', 'on');
 if (attachment) form.append('cv', new Blob(['test-cv-content']), 'cv.pdf');
 return new Request('https://example.com/api/apply', { method: 'POST', headers: { origin: 'https://example.com' }, body: form });
}

test('SMTP uses TLS and generates a MIME message with reply address and intact attachment', async () => {
 let options, raw;
 const env = createMailEnvironment(settings, config => {
  options = config;
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  return { async sendMail(message) {
   raw = (await transport.sendMail(message)).message.toString();
   return { accepted: message.to, rejected: [] };
  } };
 });
 assert.equal((await apply(request(), env)).status, 200);
 assert.equal(options.port, 587);
 assert.equal(options.requireTLS, true);
 assert.equal(options.secure, false);
 assert.match(raw, /Reply-To: applicant@example.com/);
 assert.match(raw, /To: info@hsa.hu/);
 assert.match(raw, /Content-Type: text\/html/);
 assert.match(raw, /Content-Type: text\/plain/);
 assert.match(raw, /filename=oneletrajz.pdf/);
 assert.match(raw, new RegExp(Buffer.from('test-cv-content').toString('base64')));
});

test('email escapes applicant data and includes CV status and Budapest time', () => {
 const content = applicationEmail({ name: '<img src=x onerror=alert(1)> & "Name"', email: 'a@example.com', phone: '+36000000000', jobs: ['Gyöngyös - Operátor'], hasCv: false, submittedAt: new Date('2026-11-09T12:00:00Z') });
 assert.ok(!content.html.includes('<img'));
 assert.ok(content.html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;Name&quot;'));
 assert.ok(content.html.includes('Nem csatolt önéletrajzot'));
 assert.ok(content.html.includes('13:00'));
 assert.ok(content.text.includes('<img src=x onerror=alert(1)>'));
 assert.ok(applicationEmail({ name: 'Név', email: 'a@example.com', phone: '+36000000000', jobs: [], hasCv: true, submittedAt: new Date() }).html.includes('Csatolva a levélhez'));
});

test('implicit TLS, configuration errors and rejected recipients', async () => {
 let options;
 const env = createMailEnvironment({ ...settings, SMTP_PORT: '465' }, config => {
  options = config;
  return { sendMail: async () => ({ accepted: [], rejected: ['info@hsa.hu'] }) };
 });
 assert.equal(options.secure, true);
 assert.equal((await apply(request(), env)).status, 502);
 assert.throws(() => createMailEnvironment({ ...settings, SMTP_PASS: '' }), /SMTP_PASS/);
 assert.throws(() => createMailEnvironment({ ...settings, SMTP_PORT: 'invalid' }), /SMTP_PORT/);
});

test('invalid consent, origin and oversize CV never reach SMTP', async () => {
 let sends = 0;
 const env = { APPLICATION_FROM: settings.APPLICATION_FROM, SEND_APPLICATION_EMAIL: async () => { sends++; } };
 assert.equal((await apply(request({ consent: false }), env)).status, 400);
 const foreign = request();
 foreign.headers.set('origin', 'https://foreign.example');
 assert.equal((await apply(foreign, env)).status, 403);
 const large = new FormData();
 const valid = await request().formData();
 for (const [key, value] of valid) large.append(key, value);
 large.set('cv', new Blob([new Uint8Array(4 * 1024 * 1024 + 1)]), 'cv.pdf');
 assert.equal((await apply(new Request('https://example.com/api/apply', { method: 'POST', body: large }), env)).status, 400);
 assert.equal(sends, 0);
});
