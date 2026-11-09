(() => {
 const key = 'hsa-privacy-v1';
 const lifetime = 180 * 86400000;
 const banner = document.querySelector('#privacy-notice');
 const settings = document.querySelector('#privacy-settings');
 const state = document.querySelector('#privacy-state');
 let choice = null;
 try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved?.version === 1 && typeof saved.allowed === 'boolean' && saved.expires > Date.now() && saved.expires <= Date.now() + lifetime) choice = saved.allowed;
 } catch { /* Storage may be unavailable; default to no tracking. */ }
 function notify() {
  window.dispatchEvent(new CustomEvent('hsa:analytics-consent', { detail: choice === true }));
 }
 function describe() {
  const translate = text => window.hsaLocale?.messages[text] || text;
  state.textContent = translate(choice === true ? 'Jelenlegi választás: statisztika engedélyezve.' : choice === false ? 'Jelenlegi választás: statisztika elutasítva.' : 'A statisztika a döntésedig kikapcsolva marad.');
 }
 function save(allowed) {
  choice = allowed;
  try { localStorage.setItem(key, JSON.stringify({ version: 1, allowed, expires: Date.now() + lifetime })); } catch { /* The current-page choice still applies. */ }
  const returnFocus = banner.contains(document.activeElement);
  banner.hidden = true;
  describe(); notify();
  if (returnFocus) settings.focus();
 }
 document.querySelector('#privacy-accept').addEventListener('click', () => save(true));
 document.querySelector('#privacy-reject').addEventListener('click', () => save(false));
 settings.addEventListener('click', () => { banner.hidden = false; describe(); document.querySelector('#privacy-reject').focus(); });
 window.addEventListener('storage', event => {
  if (event.key !== key && event.key !== null) return;
  // Another tab changed the decision: reload it before another pageview can be measured.
  location.reload();
 });
 describe();
 window.addEventListener('hsa:languagechange', describe);
 banner.hidden = choice !== null;
 notify();
})();
