export async function apply(request,env){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply({error:'Nem támogatott kérés.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Érvénytelen kérés.'},403);
 if(Number(request.headers.get('content-length'))>6*1024*1024)return reply({error:'A feltöltés túl nagy. Legfeljebb 5 MB-os önéletrajzot válassz.'},413);
 if(!env.RESEND_API_KEY||!env.APPLICATION_FROM)return reply({error:'Az online jelentkezés bekötése folyamatban van. Kérjük, jelentkezésedet és önéletrajzodat küldd az info@hsa.hu címre.'},503);
 try{const f=await request.formData(),name=String(f.get('name')||'').trim(),email=String(f.get('email')||'').trim(),phone=String(f.get('phone')||'').trim(),jobs=f.getAll('jobs'),cv=f.get('cv');
 if(!name||name.length>150||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!/^\+?[0-9() .-]{6,30}$/.test(phone)||!jobs.length||jobs.some(j=>!['Gyöngyös – Operátor','Jászárokszállás – Betanított ülőmunka'].includes(j))||f.get('consent')!=='on')return reply({error:'Kérjük, töltsd ki az összes kötelező mezőt és válassz legalább egy állást.'},400);
 let attachments=[];if(cv&&typeof cv!=='string'&&cv.size){if(cv.size>5*1024*1024||!/\.(pdf|doc|docx)$/i.test(cv.name))return reply({error:'Az önéletrajz PDF, DOC vagy DOCX lehet, legfeljebb 5 MB méretben.'},400);const bytes=new Uint8Array(await cv.arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));attachments.push({filename:'oneletrajz.'+cv.name.split('.').pop().toLowerCase(),content:btoa(raw)})}
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.APPLICATION_FROM,to:['info@hsa.hu'],reply_to:email,subject:'Új HSA állásjelentkezés',text:`Név: ${name}\nE-mail: ${email}\nTelefonszám: ${phone}\nÁllások: ${jobs.join(', ')}\nAdatkezelési hozzájárulás: igen\nIdőpont: ${new Date().toISOString()}`,attachments})});
 if(!r.ok)return reply({error:'A levélküldés nem sikerült. Kérjük, próbáld újra, vagy írj az info@hsa.hu címre.'},502);return reply({ok:true});
 }catch{return reply({error:'A jelentkezést nem sikerült feldolgozni. Kérjük, próbáld újra.'},400)}
}
