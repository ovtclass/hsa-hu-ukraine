import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
export const ukrainian = JSON.parse(readFileSync(new URL('locales/uk.json', root), 'utf8'));
const unchanged = new Set(['UA', 'HU', '↗', '↘', 'WE SEARCH. WE FIND.', '0 EUR', 'i', '01', '02', '03', '+', '*', 'HSA.', 'info@hsa.hu ↗', '/']);
export function translateLanding(source) {
 const missing = new Set();
 let html = source.split(/(<[^>]+>)/g).map(part => {
  if (part.startsWith('<')) return part.replace(/(aria-label|alt|placeholder|content)="([^"]*)"/g, (all, attribute, value) => ukrainian.attributes[value] ? `${attribute}="${ukrainian.attributes[value]}"` : all);
  const text = part.trim();
  if (!text || unchanged.has(text)) return part;
  if (!Object.hasOwn(ukrainian.text, text)) { missing.add(text); return part; }
  return part.replace(text, ukrainian.text[text]);
 }).join('');
 if (missing.size) throw new Error('Missing Ukrainian translations: ' + [...missing].join(' | '));
 html = html.replace('<html lang="hu">', '<html lang="uk">')
  .replace('href="/ua" lang="uk" hreflang="uk"', 'href="/ua" lang="uk" hreflang="uk" aria-current="page"')
  .replace('href="/" lang="hu" hreflang="hu" aria-current="page"', 'href="/" lang="hu" hreflang="hu"')
  .replaceAll('href="/adatvedelem.html"', 'href="/adatvedelem-ua.html"')
  .replace('<script src="script.js">', '<script src="uk.js"></script><script src="script.js">');
 html = html.replace(/(src|href)="((?:assets\/)[^"]+|(?:style|privacy|script|analytics|uk)\.(?:css|js))"/g, '$1="/$2"');
 return html;
}
export function buildLocales() {
 writeFileSync(new URL('dist/ua.html', root), translateLanding(readFileSync(new URL('dist/index.html', root), 'utf8')));
 writeFileSync(new URL('dist/uk.js', root), 'window.hsaLocale = ' + JSON.stringify({ questions: ukrainian.questions, messages: ukrainian.messages }) + ';\n');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) buildLocales();
