const test = require('node:test');
const assert = require('node:assert/strict');
const {createHandler} = require('../api/contact');
const {createHandler:createPrices} = require('../api/prices');
const dictionaries = require('../premium/dictionaries.json');
function response() {
  return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(value){this.body=value;return this}};
}
const valid = {name:'Test Visitor',email:'visitor@example.test',service:'app',budget:'unsure',message:'A test business project.',locale:'vi',website:''};
const request = (body=valid,headers={}) => ({method:'POST',headers:{origin:'https://stackcraft.co.nz','content-type':'application/json','x-forwarded-for':'192.0.2.1',...headers},body});
test('all nine locales return localized success only after owner provider acceptance',async()=>{
  for(const locale of Object.keys(dictionaries)) {
    const messages=[];
    const handler=createHandler({env:{NODE_ENV:'production'},sendEmail:async m=>{messages.push(m);return {data:{id:'mock-id'}}}});
    const res=response();await handler(request({...valid,locale}),res);
    assert.equal(res.code,200);assert.equal(res.body.message,dictionaries[locale].sent);
    assert.equal(messages.length,2);assert.equal(messages[1].subject,`${dictionaries[locale].emailSubject} — Stackcraft`);
  }
});
test('provider rejection, missing id and thrown errors never report success',async()=>{
  for(const outcome of [{error:{message:'rejected'}},{data:{}},null,'throw']) {
    let calls=0;const handler=createHandler({sendEmail:async()=>{calls++;if(outcome==='throw')throw Error('test');return outcome}});
    const res=response();await handler(request(),res);assert.equal(res.code,502);assert.equal(res.body.success,false);assert.equal(calls,1);
  }
});
test('confirmation failure does not invalidate owner delivery',async()=>{
  let calls=0;const handler=createHandler({sendEmail:async()=>{if(++calls===2)throw Error('test');return {data:{id:'ok'}}}});
  const res=response();await handler(request(),res);assert.equal(res.code,200);assert.equal(calls,2);
});
test('malformed, oversized, injected and invalid requests never send mail',async()=>{
  let calls=0;const handler=createHandler({sendEmail:async()=>{calls++;return {data:{id:'unexpected'}}}});
  const bad=[null,[],{...valid,name:{}},{...valid,email:'a@example.test\r\nBcc: victim@example.test'},{...valid,message:'tiny'},{...valid,message:'x'.repeat(6501)},{...valid,website:'bot'},{...valid,service:'unlisted'},{...valid,budget:'unlisted'},{...valid,locale:'xx'},{...valid,currency:'GBP'},{...valid,onsite:true},{...valid,onsite:'yes'}];
  for(const body of bad){const res=response();await handler(request(body),res);assert.equal(res.code,400);}
  for(const [headers,code] of [[{origin:'https://evil.example'},403],[{'sec-fetch-site':'cross-site'},403],[{'content-type':'text/plain'},415],[{'content-length':'999999'},413]]){
    const res=response();await handler(request(valid,headers),res);assert.equal(res.code,code);
  }
  let res=response();await handler(request('{bad json'),res);assert.equal(res.code,400);
  res=response();await handler(request(JSON.stringify({...valid,message:'字'.repeat(12000)})),res);assert.equal(res.code,413);
  assert.equal(calls,0);
});
test('HTML is escaped, on-site fields retained and currency context preserved',async()=>{
  const sent=[];const handler=createHandler({sendEmail:async m=>{sent.push(m);return {data:{id:'ok'}}}});
  const res=response();await handler(request({...valid,name:'<img src=x>',message:'<script>alert(1)</script>',onsite:true,country:'Vietnam',duration:'3 days',systems:'Legacy CRM',confidentiality:'NDA requested',currency:'VND'}),res);
  assert.equal(res.code,200);assert.ok(!sent[0].html.includes('<script>'));assert.ok(sent[0].html.includes('&lt;script&gt;'));
  for(const value of ['Vietnam','3 days','Legacy CRM','NDA requested','VND'])assert.ok(sent[0].text.includes(value));
  assert.ok(!sent[1].html.includes('alert(1)'));
});
test('burst limit returns Retry-After and expires',async()=>{
  let time=0,calls=0;const handler=createHandler({now:()=>time,sendEmail:async()=>{calls++;return {data:{id:'ok'}}}});
  for(let i=0;i<5;i++){const r=response();await handler(request(),r);assert.equal(r.code,200)}
  const blocked=response();await handler(request(),blocked);assert.equal(blocked.code,429);assert.equal(blocked.headers['Retry-After'],'600');assert.equal(calls,10);
  time=600001;const res=response();await handler(request(),res);assert.equal(res.code,200);
});
test('methods and untrusted preview origins rejected; configured preview accepted',async()=>{
  const handler=createHandler({env:{NODE_ENV:'production',VERCEL_URL:'known.vercel.app'},sendEmail:async()=>({data:{id:'ok'}})});
  const get=response();await handler({...request(),method:'GET'},get);assert.equal(get.code,405);
  const bad=response();await handler(request(valid,{origin:'https://unknown.vercel.app'}),bad);assert.equal(bad.code,403);
  const good=response();await handler(request(valid,{origin:'https://known.vercel.app'}),good);assert.equal(good.code,200);
});
test('prices endpoint supports five currencies, rejects others and reports upstream failure honestly',async()=>{
  const handler=createPrices(async()=>({convertedCatalogue:async currency=>({currency,prices:{consult:{min:349,max:349}}})}));
  for(const currency of ['USD','EUR','NZD','AUD','VND']){const r=response();await handler({method:'GET',query:{currency}},r);assert.equal(r.code,200);assert.equal(r.body.currency,currency)}
  const bad=response();await handler({method:'GET',query:{currency:['USD','VND']}},bad);assert.equal(bad.code,400);
  const method=response();await handler({method:'POST'},method);assert.equal(method.code,405);
  const failed=response();await createPrices(async()=>{throw Error('unavailable')})({method:'GET',query:{currency:'VND'}},failed);assert.equal(failed.code,503);assert.equal(failed.body.currency,'USD');assert.equal(failed.headers['Cache-Control'],'no-store');
});
test('base USD prices load from actual catalogue without fetching exchange rates',async()=>{
  const res=response();await createPrices()({method:'GET',query:{currency:'USD'}},res);
  assert.equal(res.code,200);assert.equal(res.body.prices.consult.min,349);assert.equal(res.body.prices.app.min,12000);
});
