import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { ukrainian } from '../scripts/build-locales.mjs';

const runtime = await readFile(new URL('../scripts/language-runtime.js', import.meta.url), 'utf8');
function browser(cookie = '', blocked = false) {
 let written = '', index = 0;
 const heading = { nodeValue: 'Вакансії', parentElement: { closest() { return null; } } };
 const elements = ['uk', 'hu'].map(language => ({ dataset: { language }, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener(_, fn) { this.click = fn; } }));
 const panels = ['uk', 'hu'].map(languagePanel => ({ dataset: { languagePanel }, hidden: false }));
 const placeholder = { attributes: { placeholder: 'Твоє ім’я та прізвище' }, getAttribute(key) { return this.attributes[key]; }, setAttribute(key, value) { this.attributes[key] = value; } };
 const document = {
  documentElement: { lang: 'uk' },
  createTreeWalker() { return { nextNode() { return index++ === 0 ? heading : null; } }; },
  querySelectorAll(selector) { return selector === '[data-language]' ? elements : selector === '[data-language-panel]' ? panels : [placeholder]; },
 };
 Object.defineProperty(document, 'cookie', { get() { if (blocked) throw new Error(); return cookie; }, set(value) { if (blocked) throw new Error(); written = value; cookie = value.split(';')[0]; } });
 const events = [];
 const window = { hsaTranslations: ukrainian, dispatchEvent(event) { events.push(event); } };
 vm.runInNewContext(runtime, { window, document, NodeFilter: { SHOW_TEXT: 4 }, location: { protocol: 'https:' }, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } } });
 return { window, document, heading, elements, panels, placeholder, events, written: () => written };
}
test('cookie selects language on load, default is Ukrainian, invalid cookies are ignored', () => {
 for (const cookie of ['', 'hsa_language=other', 'hsa_language=%3Cscript%3E']) {
  const page = browser(cookie); assert.equal(page.document.documentElement.lang, 'uk'); assert.equal(page.heading.nodeValue, 'Вакансії');
 }
 const hu = browser('other=1; hsa_language=hu');
 assert.equal(hu.document.documentElement.lang, 'hu'); assert.equal(hu.heading.nodeValue, 'Álláslehetőségek');
 assert.equal(hu.placeholder.attributes.placeholder, 'Teljes neved');
 assert.match(hu.written(), /^hsa_language=hu; Max-Age=15552000; Path=\/; SameSite=Lax; Secure$/);
});
test('switches update existing nodes, pressed state, panels and cookie without navigation', () => {
 const page = browser();
 const originalNode = page.heading;
 page.elements[1].click();
 assert.equal(page.heading, originalNode);
 assert.equal(page.heading.nodeValue, 'Álláslehetőségek');
 assert.equal(page.elements[1].attributes['aria-pressed'], 'true');
 assert.equal(page.panels[0].hidden, true); assert.equal(page.panels[1].hidden, false);
 assert.match(page.written(), /^hsa_language=hu;/);
 assert.equal(page.events.at(-1).detail, 'hu');
 page.elements[0].click(); assert.equal(page.heading.nodeValue, 'Вакансії');
 assert.equal(page.window.hsaLocale, ukrainian);
 const returning = browser('hsa_language=hu'); assert.equal(returning.document.documentElement.lang, 'hu');
});
test('blocked cookies do not prevent on-page language switching', () => {
 const page = browser('', true);
 assert.equal(page.document.documentElement.lang, 'uk');
 page.elements[1].click(); assert.equal(page.document.documentElement.lang, 'hu');
});
