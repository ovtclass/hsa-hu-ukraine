const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=value=>({sent:'Elküldve',failed:'Sikertelen',pending:'Függőben'}[value]||'Ismeretlen');
const values=r=>[new Date(r.submittedAt).toLocaleString('hu-HU',{timeZone:'Europe/Budapest'}),r.name,r.email,r.phone,r.jobs.join(', '),status(r.notification),r.consent?'Megadva':'Hiányzik',r.consentVersion];
const headings=['Beküldés (magyar idő)','Név','E-mail','Telefon','Állás','E-mail értesítés','Hozzájárulás','Tájékoztató verziója'];
export function applicationsCsv(rows){
 const cell=value=>'"'+String(value??'').replace(/^[\s]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 return '\uFEFF'+[headings,...rows.map(values)].map(row=>row.map(cell).join(';')).join('\r\n');
}
export function renderApplications(rows,truncated=false){return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HSA | Jelentkezők</title><link rel="stylesheet" href="/analytics-dashboard.css"></head><body><main><header><h1>Jelentkezők</h1><a href="/statisztika">Statisztika</a></header><p>${rows.length} jelentkezés. <a href="?format=csv">CSV letöltése</a> · <a href="/jelentkezok">Frissítés</a></p>${truncated?'<p>A lista és az export legfeljebb 5000 rekordot tartalmaz.</p>':''}<p>A sikertelen vagy függőben lévő értesítésekhez tartozó jelentkezések is el vannak mentve.</p><div class="table-wrap"><table><thead><tr>${headings.map(h=>`<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${values(r).map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${rows.length?'':'<p>Még nem érkezett jelentkezés.</p>'}</main></body></html>`;}
