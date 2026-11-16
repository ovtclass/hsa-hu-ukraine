import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
export const ukrainian = JSON.parse(readFileSync(new URL('locales/uk.json', root), 'utf8'));
const unchanged = new Set(['UA', 'HU', '↗', '↘', 'WE SEARCH. WE FIND.', '0 EUR', 'i', '01', '02', '03', '+', '*', 'HSA.', 'info@hsa.hu ↗', '/']);
export function translateLanding(source, translations = ukrainian) {
 const missing = new Set();
 let html = source.split(/(<[^>]+>)/g).map(part => {
  if (part.startsWith('<')) return part.replace(/(aria-label|alt|placeholder|content)="([^"]*)"/g, (all, attribute, value) => translations.attributes[value] ? `${attribute}="${translations.attributes[value]}"` : all);
  const text = part.trim();
  if (!text || unchanged.has(text)) return part;
  if (!Object.hasOwn(translations.text, text)) { missing.add(text); return part; }
  return part.replace(text, translations.text[text]);
 }).join('');
 if (missing.size) throw new Error('Missing Ukrainian translations: ' + [...missing].join(' | '));
 html = html.replace('<html lang="hu">', '<html lang="uk">');
 html = html.replace(/(src|href)="((?:assets\/)[^"]+|(?:style|privacy|script|analytics|language)\.(?:css|js))"/g, '$1="/$2"');
 return html;
}
export function buildLocales() {
 mkdirSync(new URL('dist/cz-pl/', root), { recursive: true });
 writeFileSync(new URL('dist/cz-pl/index.html', root), translateLanding(readFileSync(new URL('locales/index.hu.html', root), 'utf8')));
 const home = JSON.parse(readFileSync(new URL('locales/home.uk.json', root), 'utf8'));
 const homeTranslations = { ...ukrainian, text: { ...ukrainian.text, ...home.text }, attributes: { ...ukrainian.attributes, ...home.attributes }, questions: home.questions };
 writeFileSync(new URL('dist/index.html', root), translateLanding(readFileSync(new URL('locales/index.home.hu.html', root), 'utf8'), homeTranslations).replace('src="language-home.js"', 'src="/language-home.js"'));
 writeFileSync(new URL('dist/language-home.js', root), 'window.hsaTranslations = ' + JSON.stringify(homeTranslations) + ';\nwindow.hsaQuestionOverrides = ' + JSON.stringify(home.hungarianQuestions) + ';\n' + readFileSync(new URL('scripts/language-runtime.js', root), 'utf8'));
 const huPolicy = readFileSync(new URL('locales/privacy.hu.html', root), 'utf8');
 const ukPolicy = readFileSync(new URL('locales/privacy.uk.html', root), 'utf8');
 const content = html => html.match(/<main class="privacy-page">([\s\S]*?)<\/main>/)[1];
 const switcher = '<nav class="language-switch" aria-label="Вибір мови"><button type="button" data-language="uk" lang="uk" aria-pressed="true">UA</button><span aria-hidden="true">/</span><button type="button" data-language="hu" lang="hu" aria-pressed="false">HU</button></nav>';
 let policy = ukPolicy.replace(content(ukPolicy), switcher + '<section data-language-panel="uk">' + content(ukPolicy) + '</section><section data-language-panel="hu" hidden>' + content(huPolicy) + '</section>');
 policy = policy.replace('</body>', '<script src="/language.js"></script></body>');
 writeFileSync(new URL('dist/cz-pl/adatvedelem.html', root), policy);
 writeFileSync(new URL('dist/adatvedelem.html', root), policy.replaceAll('href="/cz-pl/"', 'href="/"').replace('src="/language.js"', 'src="/language-home.js"'));
 writeFileSync(new URL('dist/language.js', root), 'window.hsaTranslations = ' + JSON.stringify(ukrainian) + ';\n' + readFileSync(new URL('scripts/language-runtime.js', root), 'utf8'));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) buildLocales();
