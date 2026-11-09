import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const tracker = await readFile(new URL('../dist/analytics.js', import.meta.url), 'utf8');
const privacy = await readFile(new URL('../dist/privacy.js', import.meta.url), 'utf8');
function browser(saved, storageBlocked = false) {
 const listeners = {}, calls = [], elements = {};
 let stored = saved;
 for (const id of ['privacy-notice', 'privacy-settings', 'privacy-state', 'privacy-accept', 'privacy-reject']) elements[id] = { hidden: true, textContent: '', handlers: {}, addEventListener(event, fn) { this.handlers[event] = fn; }, contains: () => false, focus() {} };
 const context = {
  window: { addEventListener(event, fn) { (listeners[event] ||= []).push(fn); }, dispatchEvent(event) { for (const fn of listeners[event.type] || []) fn(event); } },
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  localStorage: { getItem() { if (storageBlocked) throw new Error(); return stored; }, setItem(_, value) { if (storageBlocked) throw new Error(); stored = value; } },
  navigator: {}, location: { pathname: '/', reload() {} },
  document: { referrer: '', querySelector: selector => elements[selector.slice(1)] }, URL,
  fetch: (...args) => { calls.push(args); return Promise.resolve(); },
 };
 vm.createContext(context); vm.runInContext(tracker, context); vm.runInContext(privacy, context);
 return { elements, calls, saved: () => stored, click: id => elements[id].handlers.click() };
}
test('notice starts disabled, remembers rejection and allows explicit later opt-in', () => {
 const page = browser(null);
 assert.equal(page.calls.length, 0); assert.equal(page.elements['privacy-notice'].hidden, false);
 page.click('privacy-reject'); assert.equal(page.calls.length, 0);
 assert.equal(JSON.parse(page.saved()).allowed, false);
 const next = browser(page.saved()); assert.equal(next.elements['privacy-notice'].hidden, true); assert.equal(next.calls.length, 0);
 next.click('privacy-settings'); assert.equal(next.elements['privacy-notice'].hidden, false);
 next.click('privacy-accept'); assert.equal(next.calls.length, 1);
 const accepted = browser(next.saved()); assert.equal(accepted.calls.length, 1);
 accepted.click('privacy-settings'); accepted.click('privacy-reject');
 assert.equal(browser(accepted.saved()).calls.length, 0);
});
test('expired consent, invalid consent and blocked storage all fail closed', () => {
 for (const saved of ['invalid', JSON.stringify({ version: 1, allowed: true, expires: Date.now() - 1 }), JSON.stringify({ version: 0, allowed: true, expires: Date.now() + 100000 })]) {
  const page = browser(saved); assert.equal(page.calls.length, 0); assert.equal(page.elements['privacy-notice'].hidden, false);
 }
 const blocked = browser(null, true); assert.equal(blocked.calls.length, 0);
 blocked.click('privacy-reject'); assert.equal(blocked.calls.length, 0);
});
test('landing loads tracker before consent and makes privacy controls available', async () => {
 const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
 assert.ok(html.indexOf('src="/analytics.js"') < html.indexOf('src="/privacy.js"'));
 assert.match(html, /id="privacy-settings"/); assert.match(html, /id="privacy-notice"/);
 assert.match(html, /href="\/adatvedelem.html"/);
 const css = await readFile(new URL('../dist/style.css', import.meta.url), 'utf8');
 assert.ok(!css.includes('fonts.googleapis.com'));
});
