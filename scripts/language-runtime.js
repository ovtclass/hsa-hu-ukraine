(() => {
 const translations = window.hsaTranslations;
 const textPairs = Object.entries(translations.text);
 const attributePairs = Object.entries(translations.attributes);
 const texts = [], attributes = [];
 const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
 let node;
 while ((node = walker.nextNode())) {
  if (node.parentElement?.closest('script, style, [data-language-panel]')) continue;
  const value = node.nodeValue.trim();
  const pair = textPairs.find(([hu, uk]) => value === hu.trim() || value === uk.trim());
  if (pair) texts.push({ node, pair, before: node.nodeValue.match(/^\s*/)[0], after: node.nodeValue.match(/\s*$/)[0] });
 }
 for (const element of document.querySelectorAll('[aria-label], [alt], [placeholder], meta[name="description"]')) {
  for (const name of ['aria-label', 'alt', 'placeholder', 'content']) {
   const value = element.getAttribute(name);
   const pair = attributePairs.find(([hu, uk]) => value === hu || value === uk);
   if (pair) attributes.push({ element, name, pair });
  }
 }
 function remember(language) {
  try { document.cookie = `hsa_language=${language}; Max-Age=15552000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch { /* A blocked cookie does not prevent switching. */ }
 }
 function select(language) {
  if (!['uk', 'hu'].includes(language)) return;
  const index = language === 'uk' ? 1 : 0;
  for (const { node, pair, before, after } of texts) {
   const prefix = pair[0].startsWith(',') ? (index === 1 ? ' ' : '') : before;
   node.nodeValue = prefix + pair[index].trim() + after;
  }
  for (const { element, name, pair } of attributes) element.setAttribute(name, pair[index]);
  for (const panel of document.querySelectorAll('[data-language-panel]')) panel.hidden = panel.dataset.languagePanel !== language;
  for (const button of document.querySelectorAll('[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === language));
  document.documentElement.lang = language;
  window.hsaLanguage = language;
  window.hsaLocale = language === 'uk' ? translations : null;
  remember(language);
  window.dispatchEvent(new CustomEvent('hsa:languagechange', { detail: language }));
 }
 for (const button of document.querySelectorAll('[data-language]')) button.addEventListener('click', () => select(button.dataset.language));
 let saved;
 try { saved = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('hsa_language='))?.slice('hsa_language='.length); } catch { /* Use Ukrainian. */ }
 select(saved === 'hu' ? 'hu' : 'uk');
})();
