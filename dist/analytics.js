(() => {
 const path = location.pathname.replace(/\/$/, '') || '/';
 if (!['/', '/cz-pl', '/ua', '/ua.html'].includes(path)) return;
 const landing = path.startsWith('/ua') ? '/' : path;
 const send = data => fetch('/.netlify/functions/analytics', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data), keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer',
 }).catch(() => {});
 // No cookies, storage, visitor identifier or browser/source details for the basic count.
 send({ kind: 'pageview', path: landing });
 let sent = false;
 window.addEventListener('hsa:analytics-consent', event => {
  if (event.detail !== true || sent || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  sent = true;
  let referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch { /* No source information. */ }
  send({ kind: 'detail', consent: true, path: landing, referrer });
 });
})();
