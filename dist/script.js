const t = text => window.hsaLocale?.messages[text] || text;
const questions=[['Dolgozhatok Magyarországon ukrán állampolgárként?','Igen, megfelelő tartózkodási és munkavállalási jogosultság esetén. A pontos feltételek a jelenlegi státuszodtól és az egyéni körülményeidtől függenek.'],['Ha Lengyelországban vagy Csehországban dolgozom, átköltözhetek Magyarországra?','Lehetséges, de a másik országban kiadott tartózkodási vagy munkavállalási engedély nem biztosít automatikusan magyarországi munkavállalási jogosultságot. Munkatársunk tájékoztat a jelentkezés feltételeiről.'],['Mi történik, ha katonai kötelezettség alá tartozom?','A katonai kötelezettség jelenleg önmagában nem jelent akadályt a magyarországi ideiglenes védelem kérelmezésénél: az OIF tájékoztatása szerint a hadköteles ukrán állampolgárokra vonatkozó feltételek nem változtak. A tartózkodási és munkavállalási jogosultságodat, illetve a más uniós országban fennálló védelmedet ettől függetlenül egyénileg kell megvizsgálni.'],['Beszélnem kell magyarul?','Nem, a bemutatott állásokra magyar nyelvtudás nélkül is jelentkezhetsz. A munkavégzéshez kapcsolódó tudnivalókat és az egyeztetés részleteit munkatársunkkal beszélheted át.'],['Van szálláslehetőség?','Igen, van szálláslehetőség. Az elhelyezés részleteiről, a szállás körülményeiről és az igénybevétel feltételeiről munkatársunk a jelentkezés során ad tájékoztatást.']];
const list=document.querySelector('#faq-list');
questions.forEach(()=>{const d=document.createElement('details'),s=document.createElement('summary'),q=document.createTextNode(''),plus=document.createElement('span'),p=document.createElement('p');plus.textContent='+';plus.setAttribute('aria-hidden','true');s.append(q,plus);d.append(s,p);list.append(d)});
function localizeQuestions(){(window.hsaLocale?.questions || questions).forEach(([q,a],index)=>{const detail=list.children[index];detail.querySelector('summary').firstChild.nodeValue=q;detail.querySelector('p').textContent=a})}
localizeQuestions();

const form=document.querySelector('#application-form'), boxes=[...form.querySelectorAll('[name=jobs]')],cv=document.querySelector('#app-cv'),status=document.querySelector('#form-status');
function validateJobs(){boxes[0].setCustomValidity(boxes.some(b=>b.checked)?'':t("Kérjük, válassz legalább egy állást!"))}boxes.forEach(b=>b.addEventListener('change',validateJobs));validateJobs();
cv.addEventListener('change',()=>{const f=cv.files[0];cv.setCustomValidity(f&&(f.size>4*1024*1024||! /\.(pdf|doc|docx)$/i.test(f.name))?t("PDF, DOC vagy DOCX fájlt válassz, legfeljebb 4 MB méretben."):'')});
document.querySelectorAll('.choose').forEach(a=>a.addEventListener('click',()=>{boxes.forEach(b=>b.checked=b.value===a.dataset.job);validateJobs()}));
form.addEventListener('submit',async e=>{e.preventDefault();validateJobs();if(!form.reportValidity())return;const button=form.querySelector('button');button.disabled=true;status.className='';status.textContent=t("Jelentkezés küldése…");try{let response;try{response=await fetch('/api/apply',{method:'POST',body:new FormData(form)})}catch{throw new Error(t('Hálózati hiba történt. Kérjük, próbáld újra.'))}let data;try{data=await response.json()}catch{throw new Error(t('A küldés nem sikerült. Kérjük, próbáld újra.'))}if(!response.ok)throw new Error(t(data.error)||t("A küldés nem sikerült. Kérjük, próbáld újra."));status.className='success';status.textContent=t("Köszönjük a jelentkezésedet! Munkatársunk felveszi veled a kapcsolatot.");form.reset();validateJobs()}catch(error){status.className='error';status.textContent=t(error.message)||t("Hálózati hiba történt. Kérjük, próbáld újra.")}finally{button.disabled=false}});

if('IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const targets=document.querySelectorAll('.intro>div,.section-head,.job,.about>div,.steps .wrap>h2,.step-grid article,.faq>div,.apply-inner>div');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08});targets.forEach(el=>{el.classList.add('reveal');observer.observe(el)});document.documentElement.classList.add('motion-ready')}

{
 for(const input of form.querySelectorAll('[name=name],[name=email],[name=phone],[name=consent]')){
  input.addEventListener('invalid',()=>{
   if(input.validity.valueMissing)input.setCustomValidity(t(input.name==='consent'?'Kérjük, fogadd el az adatkezelési tájékoztatót.':'Kérjük, töltsd ki ezt a mezőt.'));
   else if(input.validity.typeMismatch)input.setCustomValidity(t('Kérjük, adj meg érvényes e-mail-címet.'));
   else if(input.validity.patternMismatch)input.setCustomValidity(t('Kérjük, adj meg érvényes telefonszámot.'));
  });
  input.addEventListener('input',()=>input.setCustomValidity(''));
  input.addEventListener('change',()=>input.setCustomValidity(''));
 }
}

window.addEventListener('hsa:languagechange',()=>{
 localizeQuestions();
 for(const input of form.querySelectorAll('[name=name],[name=email],[name=phone],[name=consent]'))input.setCustomValidity('');
 validateJobs();
 cv.dispatchEvent(new Event('change'));
 const messages=window.hsaTranslations.messages;
 const current=status.textContent;
 const source=Object.keys(messages).find(key=>key===current||messages[key]===current);
 if(source)status.textContent=t(source);
});
