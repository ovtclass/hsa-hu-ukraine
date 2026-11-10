import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../worker/api.mjs';
import { renderApplications, applicationsCsv } from '../worker/applications.mjs';
import handler from '../netlify/functions/applications.mjs';
const request=()=>{
 const form=new FormData();
 for(const [key,value] of Object.entries({name:'Teszt Elek',email:'test@example.com',phone:'+3612345678',jobs:'Gyöngyös - Operátor',consent:'on'}))form.set(key,value);
 return new Request('https://example.com/api/apply',{method:'POST',body:form});
};
test('storage precedes notification and notification failures retain the application',async()=>{
 const events=[],saved=[];
 const response=await apply(request(),{APPLICATION_FROM:'sender@example.com',SAVE_APPLICATION:async record=>{events.push('save');saved.push(structuredClone(record));},SEND_APPLICATION_EMAIL:async message=>{events.push('mail');assert.deepEqual(message.to,['kanya.istvan@hsagroup.hu','orosz.jazmin@hsagroup.hu','kaluja.sandor@hsagroup.hu']);throw Error('SMTP unavailable');}});
 assert.equal(response.status,200);
 assert.deepEqual(events,['save','mail','save']);
 assert.equal(saved[0].notification,'pending');
 assert.equal(saved[1].notification,'failed');
 assert.equal(saved[0].id,saved[1].id);
});
test('storage failure blocks sending and does not claim success',async()=>{
 let sent=false;
 const response=await apply(request(),{SAVE_APPLICATION:async()=>{throw Error('Unavailable');},SEND_APPLICATION_EMAIL:async()=>{sent=true;}});
 assert.equal(response.status,503);assert.equal(sent,false);
});
test('dashboard and CSV require authentication, escape HTML and neutralize formulas',async()=>{
 for(const url of ['https://example.com/jelentkezok','https://example.com/jelentkezok?format=csv']){
  const response=await handler(new Request(url),{deploy:{context:'production'}});
  assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/no-store/);
 }
 const row={submittedAt:new Date().toISOString(),name:'=1+1',email:'<img src=x>',phone:'+3612345678',jobs:['Gyöngyös'],notification:'failed',consent:true};
 assert.ok(!renderApplications([row]).includes('<img src=x>'));
 assert.ok(applicationsCsv([row]).includes("'=1+1"));
 assert.ok(applicationsCsv([row]).includes("'+3612345678"));
});
