import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { translateLanding, ukrainian } from '../scripts/build-locales.mjs';
import { apply } from '../worker/api.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('one landing defaults to Ukrainian and uses JavaScript buttons instead of language URLs', async () => {
 const html = await read('dist/index.html');
 assert.match(html, /<html lang="uk">/);
 assert.match(html, /data-language="uk" lang="uk" aria-pressed="true"/);
 assert.match(html, /data-language="hu" lang="hu" aria-pressed="false"/);
 assert.ok(!html.includes('href="/ua"'));
 assert.ok(html.indexOf('src="/language.js"') < html.indexOf('src="/script.js"'));
 assert.match(html, /placeholder="Твоє ім’я та прізвище"/);
 const source = await read('locales/index.hu.html');
 assert.throws(() => translateLanding(source.replace('Álláslehetőségek', 'Untranslated new heading')), /Missing Ukrainian/);
 const policy = await read('dist/adatvedelem.html');
 assert.match(policy, /hsa_language/);
 assert.match(policy, /data-language-panel="hu" hidden/);
});

test('Ukrainian form keeps canonical Hungarian jobs and sends Hungarian notification emails', async () => {
 const uk = await read('dist/index.html');
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
