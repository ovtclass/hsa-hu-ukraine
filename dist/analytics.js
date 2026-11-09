(() => {
 let sent = false;
 window.addEventListener('hsa:analytics-consent', event => {
  if (event.detail !== true || sent || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true || !['/', '/ua', '/ua/', '/ua.html'].includes(location.pathname)) return;
  sent = true;
  let referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch { /* No source information. */ }
  fetch('/.netlify/functions/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true, path: '/', referrer }), keepalive: true }).catch(() => {});
 });
})();
