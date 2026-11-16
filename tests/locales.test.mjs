import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { translateLanding, ukrainian } from '../scripts/build-locales.mjs';
import { apply } from '../worker/api.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('one landing defaults to Ukrainian and uses JavaScript buttons instead of language URLs', async () => {
 const html = await read('dist/cz-pl/index.html');
 assert.match(html, /<html lang="uk">/);
 assert.match(html, /data-language="uk" lang="uk" aria-pressed="true"/);
 assert.match(html, /data-language="hu" lang="hu" aria-pressed="false"/);
 assert.ok(!html.includes('href="/ua"'));
 assert.ok(html.indexOf('src="/language.js"') < html.indexOf('src="/script.js"'));
 assert.match(html, /placeholder="Твоє ім’я та прізвище"/);
 const source = await read('locales/index.hu.html');
 assert.throws(() => translateLanding(source.replace('Álláslehetőségek', 'Untranslated new heading')), /Missing Ukrainian/);
 const policy = await read('dist/cz-pl/adatvedelem.html');
 assert.match(policy, /hsa_language/);
 assert.match(policy, /data-language-panel="hu" hidden/);
});

test('Ukrainian form keeps canonical Hungarian jobs and sends Hungarian notification emails', async () => {
 const uk = await read('dist/cz-pl/index.html');
 const jobs = [...uk.matchAll(/name="jobs" value="([^"]+)"/g)].map(match => match[1]);
 assert.deepEqual(jobs, ['Gyöngyös - Operátor', 'Jászárokszállás - Betanított ülőmunka']);
 const form = new FormData();
 for (const [key, value] of Object.entries({ name: 'Олена Коваль', email: 'applicant@example.com', phone: '+380501234567', consent: 'on' })) form.set(key, value);
 jobs.forEach(job => form.append('jobs', job));
 let message;
 const response = await apply(new Request('https://example.com/api/apply', { method: 'POST', body: form }), { APPLICATION_FROM: 'sender@example.com', SEND_APPLICATION_EMAIL: async value => { message = value; } });
 assert.equal(response.status, 200);
 assert.equal(message.subject, 'Új HSA állásjelentkezés');
 assert.match(message.text, /Jelentkező neve: Олена Коваль/);
 assert.match(message.text, /Megjelölt állások: Gyöngyös - Operátor/);
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

test('Ukraine home has family-focused copy and its own bilingual FAQ while cz-pl stays separate', async () => {
 const home = await read('dist/index.html');
 const hu = await read('locales/index.home.hu.html');
 const cz = await read('dist/cz-pl/index.html');
 const bundle = await read('dist/language-home.js');
 const translations = JSON.parse(bundle.match(/^window.hsaTranslations = (.+);$/m)[1]);
 const overrides = JSON.parse(bundle.match(/^window.hsaQuestionOverrides = (.+);$/m)[1]);
 assert.match(home, /Працюй в Угорщині/);
 assert.match(home, /свою родину/);
 assert.match(hu, /Segítsd a <em>családodat/);
 assert.match(home, /src="\/language-home.js"/);
 assert.match(cz, /src="\/language.js"/);
 assert.match(cz, /Живеш і працюєш у Польщі або Чехії/);
 assert.doesNotMatch(home, /Польщі|Чехії|Правила змінюються/);
 assert.doesNotMatch(JSON.stringify([translations.questions, overrides]), /військов|katonai|hadköteles|Lengyelország|Csehország|Польщі|Чехії/i);
 assert.equal(translations.questions.length, 5);
 assert.equal(overrides.length, 2);
 assert.match(home, /1 480 EUR/);
 const policy = await read('dist/adatvedelem.html');
 assert.match(policy, /href="\/"/);
 assert.doesNotMatch(policy, /href="\/cz-pl\/"/);
});

test('both landing forms post to the backend without JavaScript and have a valid modern phone pattern', async () => {
 for (const file of ['locales/index.hu.html','locales/index.home.hu.html']) {
  const html = await read(file);
  assert.match(html, /<form id="application-form" action="\/api\/apply" method="post"/);
  const pattern = html.match(/name="phone"[^>]+pattern="([^"]+)"/)[1];
  const regex = new RegExp('^(?:' + pattern + ')$', 'v');
  assert.equal(regex.test('+380 (67) 123-45-67'), true);
  assert.equal(regex.test('abcdefghi'), false);
  assert.equal(regex.test('++380671234567'), false);
 }
});

test('landing forms submit their own canonical source without depending on JavaScript or consent', async () => {
 for(const [file,sourcePage] of [['dist/index.html','/'],['dist/cz-pl/index.html','/cz-pl/']]) {
  const html=await read(file);
  assert.ok(html.includes('<input type="hidden" name="sourcePage" value="'+sourcePage+'">'));
 }
});
