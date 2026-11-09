import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { translateLanding, ukrainian } from '../scripts/build-locales.mjs';
import { apply } from '../worker/api.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('both static languages have accessible switches with only the current language active', async () => {
 const hu = await read('dist/index.html');
 const uk = await read('dist/ua.html');
 assert.match(hu, /<html lang="hu">/); assert.match(uk, /<html lang="uk">/);
 for (const [html, active, inactive] of [[hu, 'hu', 'uk'], [uk, 'uk', 'hu']]) {
  const nav = html.match(/<nav class="language-switch"[^>]*>(.*?)<\/nav>/s)[1];
  assert.match(nav, new RegExp(`lang="${active}" hreflang="${active}" aria-current="page"`));
  assert.ok(!nav.includes(`lang="${inactive}" hreflang="${inactive}" aria-current="page"`));
 }
 assert.match(uk, /href="\/adatvedelem-ua.html"/);
 assert.match(uk, /placeholder="Твоє ім’я та прізвище"/);
 assert.ok(uk.indexOf('src="/uk.js"') < uk.indexOf('src="/script.js"'));
 assert.throws(() => translateLanding(hu.replace('Álláslehetőségek', 'Untranslated new heading')), /Missing Ukrainian/);
 const policy = await read('dist/adatvedelem-ua.html');
 assert.match(policy, /<html lang="uk">/); assert.match(policy, /href="\/ua"/);
});

test('Ukrainian form keeps canonical Hungarian jobs and sends Hungarian notification emails', async () => {
 const uk = await read('dist/ua.html');
 const jobs = [...uk.matchAll(/name="jobs" value="([^"]+)"/g)].map(match => match[1]);
 assert.deepEqual(jobs, ['Gyöngyös – Operátor', 'Jászárokszállás – Betanított ülőmunka']);
 const form = new FormData();
 for (const [key, value] of Object.entries({ name: 'Олена Коваль', email: 'applicant@example.com', phone: '+380501234567', consent: 'on' })) form.set(key, value);
 jobs.forEach(job => form.append('jobs', job));
 let message;
 const response = await apply(new Request('https://example.com/api/apply', { method: 'POST', body: form }), { APPLICATION_FROM: 'sender@example.com', SEND_APPLICATION_EMAIL: async value => { message = value; } });
 assert.equal(response.status, 200);
 assert.equal(message.subject, 'Új HSA állásjelentkezés');
 assert.match(message.text, /Jelentkező neve: Олена Коваль/);
 assert.match(message.text, /Megjelölt állások: Gyöngyös – Operátor/);
 assert.match(message.html, /Új állásjelentkezés érkezett/);
 assert.ok(!message.html.includes('Нова заявка'));
});

test('every public form and consent message has a Ukrainian translation', async () => {
 const source = await read('worker/api.mjs');
 const errors = [...source.matchAll(/error:'([^']+)'/g)].map(match => match[1]);
 for (const message of errors) assert.ok(ukrainian.messages[message], 'Missing error translation: ' + message);
 assert.equal(ukrainian.questions.length, 5);
 assert.match(ukrainian.messages['Kérjük, válassz legalább egy állást!'], /вакансію/);
});
