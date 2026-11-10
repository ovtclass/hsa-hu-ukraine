const status = document.querySelector('#status');
const number = value => new Intl.NumberFormat('hu-HU').format(value);
const countries = new Intl.DisplayNames(['hu'], { type: 'region' });
function table(target, headings, rows) {
 const container = document.querySelector('#' + target);
 container.replaceChildren();
 if (!rows.length) { container.textContent = 'Még nincs adat.'; return; }
 const table = document.createElement('table');
 const head = table.createTHead().insertRow();
 for (const title of headings) { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = title; head.append(cell); }
 const body = table.createTBody();
 for (const row of rows) { const tr = body.insertRow(); for (const value of row) tr.insertCell().textContent = value; }
 container.append(table);
}
async function load() {
 const button = document.querySelector('#refresh');
 button.disabled = true; status.textContent = 'Betöltés…';
 try {
  const response = await fetch('/statisztika?format=json&days=' + document.querySelector('#period').value, { cache: 'no-store' });
  if (!response.ok) throw new Error('A betöltés nem sikerült (' + response.status + ').');
  const data = await response.json();
  document.querySelector('#all-views').textContent = number(data.allTime.pageviews);
  document.querySelector('#all-submissions').textContent = number(data.allTime.submissions);
  document.querySelector('#views').textContent = number(data.pageviews);
  document.querySelector('#visitors').textContent = number(data.visitorDays);
  table('days', ['Nap (UTC)', 'Megnyitás', 'Napi látogató'], Object.entries(data.days).sort(([a], [b]) => b.localeCompare(a)).map(([day, values]) => [day, number(values.pageviews), number(values.submissions), number(values.visitors)]));
  for (const [key, label] of [['countries', 'Ország'], ['devices', 'Eszköz'], ['browsers', 'Böngésző'], ['sources', 'Forrás']]) {
   table(key, [label, 'Megnyitás'], Object.entries(data[key]).sort((a, b) => b[1] - a[1]).map(([name, value]) => [key === 'countries' && /^[A-Z]{2}$/.test(name) ? countries.of(name) : name, number(value)]));
  }
  status.textContent = data.since + ' - ' + data.until + (data.truncated ? ' · Részleges riport: az 50 000 megnyitásos feldolgozási korlátot elérte. Válassz rövidebb időszakot.' : ' · Frissítve: ' + new Date().toLocaleTimeString('hu-HU'));
 } catch (error) {
  status.textContent = error.message;
  document.querySelector('#views').textContent = '-'; document.querySelector('#visitors').textContent = '-';
  for (const id of ['days', 'countries', 'devices', 'browsers', 'sources']) document.querySelector('#' + id).replaceChildren();
 } finally { button.disabled = false; }
}
document.querySelector('#refresh').addEventListener('click', load);
document.querySelector('#period').addEventListener('change', load);
load();
