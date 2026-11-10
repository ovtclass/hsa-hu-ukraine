import { getStore } from '@netlify/blobs';
import { authorized } from '../../worker/analytics.mjs';
import { renderApplications, applicationsCsv } from '../../worker/applications.mjs';
export const config = { path: '/jelentkezok', rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
export default async function handler(request, context) {
 const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'"};
 if(request.method!=='GET')return new Response(null,{status:405,headers});
 if(!authorized(request,process.env.APPLICATIONS_ADMIN_PASSWORD || process.env.ANALYTICS_ADMIN_PASSWORD))return new Response('Bejelentkezés szükséges.',{status:401,headers:{...headers,'WWW-Authenticate':'Basic realm="HSA jelentkezok", charset="UTF-8"'}});
 if(context?.deploy?.context!=='production')return new Response('A jelentkezőlista csak az éles oldalon érhető el.',{status:503,headers});
 try {
  const store=getStore({name:'applications-production-v1',region:'eu-central-1',consistency:'strong'});
  const entries=[];let truncated=false;
  outer:for await(const page of store.list({paginate:true}))for(const item of page.blobs){if(entries.length>=5000){truncated=true;break outer;}entries.push(item);}
  const rows=[];
  for(let i=0;i<entries.length;i+=25)rows.push(...(await Promise.all(entries.slice(i,i+25).map(item=>store.get(item.key,{type:'json'})))).filter(Boolean));
  rows.sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
  if(new URL(request.url).searchParams.get('format')==='csv')return new Response(applicationsCsv(rows),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="hsa-jelentkezok.csv"','X-Results-Truncated':String(truncated)}});
  return new Response(renderApplications(rows,truncated),{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
 }catch{return new Response('A jelentkezőlista nem tölthető be. Próbáld újra később.',{status:503,headers});}
}
