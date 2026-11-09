const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function applicationEmail({ name, email, phone, jobs, hasCv, submittedAt }) {
 const date = new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', dateStyle: 'long', timeStyle: 'short' }).format(submittedAt);
 const rows = [
  ['Jelentkező neve', name], ['E-mail-cím', email], ['Telefonszám', phone],
  ['Megjelölt állások', jobs.join('\n')], ['Önéletrajz', hasCv ? 'Csatolva a levélhez' : 'Nem csatolt önéletrajzot'],
  ['Adatkezelési hozzájárulás', 'Megadva'], ['Beküldés időpontja', `${date} (magyar idő szerint)`],
 ];
 const text = ['Új HSA állásjelentkezés', '', ...rows.map(([label, value]) => `${label}: ${value}`), '', 'A jelentkezőnek közvetlenül erre a levélre válaszolva írhatsz.'].join('\n');
 const html = `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Új HSA állásjelentkezés</title></head>
<body style="margin:0;padding:0;background-color:#f2f4f7;color:#202b3a;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e1e5eb;border-radius:12px;">
<tr><td style="padding:28px 24px;background-color:#172c45;border-radius:12px 12px 0 0;color:#ffffff;">
<p style="margin:0 0 18px;font-size:28px;font-weight:bold;letter-spacing:2px;">HSA<span style="color:#ffcc00;">.</span></p>
<h1 style="margin:0;font-size:24px;line-height:1.3;">Új állásjelentkezés érkezett</h1>
<p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#dce4ee;">Magyarországi munkalehetőségek · Ukrán munkavállalók</p></td></tr>
<tr><td style="padding:24px;">
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Az online űrlapon az alábbi jelentkezést küldték be.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows.map(([label, value]) => `<tr><td style="padding:14px 0;border-bottom:1px solid #e5e9ee;"><p style="margin:0 0 6px;color:#637085;font-size:12px;font-weight:bold;">${escapeHtml(label)}</p><p style="margin:0;font-size:16px;line-height:1.6;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(value).replace(/\n/g, '<br>')}</p></td></tr>`).join('')}</table>
<p style="margin:24px 0 0;padding:16px;background-color:#fff8dc;border-left:4px solid #ffcc00;font-size:14px;line-height:1.6;">A jelentkezőnek közvetlenül erre a levélre válaszolva írhatsz.</p>
</td></tr><tr><td style="padding:18px 24px;border-top:1px solid #e5e9ee;color:#637085;font-size:12px;line-height:1.6;">HSA · Automatikus értesítés a jelentkezési űrlapról.<br>A levél jelentkezési adatokat tartalmaz; kezeld bizalmasan.</td></tr>
</table></td></tr></table></body></html>`;
 return { text, html };
}
