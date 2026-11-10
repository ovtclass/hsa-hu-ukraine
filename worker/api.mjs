import { randomUUID } from 'node:crypto';
import { applicationEmail } from './application-email.mjs';

export async function apply(request,env){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply({error:'Nem támogatott kérés.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Érvénytelen kérés.'},403);
 try{const f=await request.formData(),name=String(f.get('name')||'').trim(),email=String(f.get('email')||'').trim(),phone=String(f.get('phone')||'').trim(),jobs=f.getAll('jobs');
 if(!name||name.length>150||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!/^\+?[0-9() .-]{6,30}$/.test(phone)||!jobs.length||jobs.some(j=>!['Gyöngyös - Operátor','Jászárokszállás - Betanított ülőmunka'].includes(j))||f.has('cv')||f.get('consent')!=='on')return reply({error:'Kérjük, töltsd ki az összes kötelező mezőt és válassz legalább egy állást.'},400);
 const attachments=[];
 const record={id:randomUUID(),name,email,phone,jobs,consent:true,consentVersion:'2026-11-10',submittedAt:new Date().toISOString(),notification:'pending'};
 if(env.SAVE_APPLICATION)try{await env.SAVE_APPLICATION(record);}catch{return reply({error:'A jelentkezést nem sikerült feldolgozni. Kérjük, próbáld újra.'},503)}
 const message={from:env.APPLICATION_FROM,to:['kanya.istvan@hsagroup.hu','orosz.jazmin@hsagroup.hu','kaluja.sandor@hsagroup.hu'],reply_to:email,subject:'Új HSA állásjelentkezés',...applicationEmail({ name, email, phone, jobs, submittedAt: new Date() }),attachments};
 try {
  if(env.SEND_APPLICATION_EMAIL)await env.SEND_APPLICATION_EMAIL(message);
  else {if(!env.RESEND_API_KEY||!env.APPLICATION_FROM)throw new Error('Mail configuration missing');const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(message)});if(!r.ok)throw new Error('Mail delivery failed');}
 }catch{record.notification='failed';if(!env.SAVE_APPLICATION)return reply({error:'A levélküldés nem sikerült. Kérjük, próbáld újra, vagy írj az info@hsa.hu címre.'},502)}
 if(record.notification==='pending')record.notification='sent';
 if(env.SAVE_APPLICATION)try{await env.SAVE_APPLICATION(record);}catch{console.error('Notification status could not be saved.');}
 return reply({ok:true});
 }catch{return reply({error:'A jelentkezést nem sikerült feldolgozni. Kérjük, próbáld újra.'},400)}
}
