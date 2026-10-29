import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import catalogue from '../premium/catalogue.json' with {type:'json'};
import dictionaries from '../premium/dictionaries.json' with {type:'json'};
import {priceCacheSeconds,offersFor,productById,pagesFor,productsOnPage,groupsFor,campaignById,campaignActive,campaignEligible,promotionalRange,recurringCharges,displayEntries,formatUSDRange,budgetIds} from '../premium/pricing.mjs';
import {convertedCatalogue} from '../premium/prices.mjs';
import {renderPage,brandPages} from '../premium/render.mjs';

const UNITS=['projectUnit','auditUnit','monthUnit','hourUnit','programmeUnit','engagementUnit'];
const danang=campaignById('danang-2026');
const fixture={discount:.5,recurringMonths:12,eligible:['x'],startsAt:'2026-01-01T00:00:00+07:00',endsAt:'2027-01-01T00:00:00+07:00'};

test('catalogue products are complete, unique and translated in all nine languages',()=>{
 const ids=catalogue.offers.map(o=>o.id);assert.equal(new Set(ids).size,ids.length);
 const groups=new Set(catalogue.groups.map(g=>g.brand+':'+g.id));
 for(const o of catalogue.offers){
  assert.ok(['swift','stack'].includes(o.brand),o.id);assert.ok(UNITS.includes(o.unit),o.id);
  assert.ok(Number.isFinite(o.min)&&Number.isFinite(o.max)&&o.min>0&&o.min<=o.max,o.id);
  assert.ok(groups.has(o.brand+':'+o.group),o.id+' group');assert.ok(o.page,o.id+' page');
  for(const [loc,d] of Object.entries(dictionaries))for(const k of [o.id+'Name',o.id+'Desc',o.id+'Scope',o.unit])assert.ok(d[k]?.trim(),loc+':'+k);
 }
 for(const brand of ['swift','stack'])for(const page of pagesFor(brand)){
  if(productsOnPage(brand,page).length>1)for(const [loc,d] of Object.entries(dictionaries))for(const k of ['pg_'+page+'_title','pg_'+page+'_lead'])assert.ok(d[k]?.trim(),loc+':'+k);
  assert.ok(brandPages(brand).includes('services/'+page),brand+' page '+page);
 }
});

test('approved entry ranges are published as customer-paid prices',()=>{
 const expect={fix:[150,400],compact:[450,800],web:[900,1800],premium:[2000,4500],store:[1200,3000],automate:[250,750],workflow:[800,2000],pilot:[2500,6500],caretech:[49,99],carecontent:[99,199],audit:[150,400],localsearch:[300,600],diagnostic:[150,300]};
 for(const [id,[min,max]] of Object.entries(expect)){const o=productById(id);assert.deepEqual([o.min,o.max],[min,max],id)}
 assert.deepEqual([productById('consult').min,productById('consult').unit],[349,'hourUnit']);
 assert.deepEqual([productById('commerce').min,productById('commerce').plus],[15000,true]);
});

test('a 50% campaign halves standard prices exactly, including fractional dollars',()=>{
 assert.deepEqual(promotionalRange({id:'x',min:5000,max:5000,unit:'projectUnit'},fixture),{min:2500,max:2500,plus:false,unit:'projectUnit'});
 const consult=promotionalRange(productById('consult'),danang);assert.equal(consult.min,174.5);assert.equal(formatUSDRange(consult,'en'),'USD 174.50');
 assert.equal(formatUSDRange(productById('consult'),'en'),'USD 349');
});

test('recurring discounts last at most twelve months, then the standard rate applies',()=>{
 const x={id:'x'};const first=recurringCharges(250,fixture,12,x);assert.equal(first.reduce((a,b)=>a+b,0),1500);assert.ok(first.every(v=>v===125));
 const two=recurringCharges(250,fixture,24,x);assert.equal(two.slice(12).reduce((a,b)=>a+b,0),3000);assert.ok(two.slice(12).every(v=>v===250));
 assert.equal(recurringCharges(250,fixture,6,x).length,6);
 assert.ok(recurringCharges(250,fixture,12).every(v=>v===250),'no product means no discount');
 assert.ok(recurringCharges(49,danang,12,productById('caretech')).every(v=>v===49),'entry care plan is never discounted');
 assert.equal(recurringCharges(250,danang,12,productById('care'))[0],125);
});

test('entry products are never discounted a second time, on any code path',()=>{
 const entry=catalogue.offers.filter(o=>o.status==='new'||o.status==='repriced');
 assert.ok(entry.length>=13);
 const during=new Date('2026-11-10T10:00:00+07:00');const shown=displayEntries(during);
 for(const o of entry){assert.equal(campaignEligible(danang,o),false,o.id);assert.equal(promotionalRange(o,danang),null,o.id);assert.equal(shown[o.id+'~'+danang.id],undefined,o.id)}
 for(const id of danang.eligible){const o=productById(id);assert.ok(o,id);assert.notEqual(o.status,'new',id);assert.ok(shown[id+'~'+danang.id],id)}
 const vi=renderPage('swift','vi','investment');
 for(const o of entry.filter(o=>o.brand==='swift'))assert.ok(!vi.includes(`data-price="${o.id}~danang-2026"`),o.id);
});

test('the campaign window uses Vietnam time and closes at the published deadline',()=>{
 assert.equal(danang.timezone,'Asia/Ho_Chi_Minh');
 assert.equal(campaignActive(danang,new Date('2026-11-29T23:59:59+07:00')),true);
 assert.equal(campaignActive(danang,new Date('2026-11-29T16:59:59Z')),true);
 assert.equal(campaignActive(danang,new Date('2026-11-30T00:00:00+07:00')),false);
 assert.equal(campaignActive(danang,new Date('2026-11-29T17:00:00Z')),false);
 assert.equal(campaignActive(danang,new Date('2026-10-25T23:59:59+07:00')),false);
 assert.equal(Object.keys(displayEntries(new Date('2026-12-01T00:00:00+07:00'))).some(k=>k.includes('~')),false);
});

test('conversion applies the discount in USD first, converts once, and fails rather than mislabel',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({result:'success',base_code:'USD',time_last_update_unix:Math.floor(Date.now()/1000),rates:{EUR:.9,NZD:1.6,AUD:1.5,VND:25000}})});
 const now=new Date();const out=await convertedCatalogue('VND',fetcher,now);
 assert.equal(out.prices.compact.min,450*25000);assert.equal(out.prices.consult.min,349*25000);
 if(campaignActive(danang,now))assert.equal(out.prices['consult~danang-2026'].min,Math.round(174.5*25000));
 const usd=await convertedCatalogue('USD',fetcher,new Date('2026-11-10T10:00:00+07:00'));assert.equal(usd.prices['consult~danang-2026'].min,174.5);
 assert.equal(usd.prices['budget:swift:b-500'].upTo,true);
 const {convertedCatalogue:fresh}=await import('../premium/prices.mjs?fail='+Math.random());
 await assert.rejects(fresh('VND',async()=>{throw Error('offline')}),/offline/);
});

test('enquiry forms list every current product and budgets small enough for entry work',()=>{
 for(const brand of ['swift','stack']){
  const html=renderPage(brand,'en','contact');
  const service=html.slice(html.indexOf('name="service"'),html.indexOf('</select>',html.indexOf('name="service"')));
  const values=[...service.matchAll(/value="([^"]*)"/g)].map(m=>m[1]).filter(Boolean);
  assert.deepEqual(values.filter(v=>v!=='unsure').sort(),offersFor(brand).map(o=>o.id).sort());
  const budget=html.slice(html.indexOf('name="budget"'),html.indexOf('</select>',html.indexOf('name="budget"')));
  const budgets=[...budget.matchAll(/value="([^"]*)"/g)].map(m=>m[1]).filter(v=>v!=='unsure');
  for(const b of budgets)assert.ok(budgetIds(brand).includes(b),b);
  assert.ok(budget.includes('Up to USD 500'),brand+' smallest budget band');assert.ok(!budget.includes('≤'));
  assert.ok(renderPage(brand,'vi','contact').includes('Tối đa USD 500'));assert.ok(html.includes(dictionaries.en.enquiryNoCharge));
  assert.ok(!budget.includes('5,000–9,000'));
 }
 const faq=renderPage('swift','en','');for(const m of faq.matchAll(/service=([a-z]+)/g))assert.ok(m[1]==='unsure'||productById(m[1]),m[1]);
});

test('home pages lead with affordable starting points and keep the larger work visible',()=>{
 const swift=renderPage('swift','en','');
 for(const s of ['data-price="from:swift:fix">USD 150','data-price="from:swift:web">USD 450','data-price="from:swift:commerce">USD 1,200','data-price="flagship">USD 10,000–18,000','data-price="commerce">USD 15,000–30,000+'])assert.ok(swift.includes(s),s);
 assert.ok(!swift.includes('USD 5,000–9,000'));
 const stack=renderPage('stack','en','');
 for(const s of ['data-price="from:stack:automation">USD 250','data-price="from:stack:consult">USD 150','data-price="from:stack:app">USD 2,500','data-price="app">USD 12,000–25,000'])assert.ok(stack.includes(s),s);
 const web=renderPage('swift','en','services/web');for(const id of ['compact','web','premium'])assert.ok(web.includes(`id="${id}"`),id);
});

test('pricing files are identical to the recorded lock shared with the sibling repository',()=>{
 const lock=JSON.parse(fs.readFileSync(new URL('../premium/pricing.lock.json',import.meta.url),'utf8'));
 for(const [file,hash] of Object.entries(lock.files)){const text=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(text).digest('hex'),hash,file+' changed without running scripts/sync-pricing.mjs')}
});

// site.js in a minimal browser stand-in: currency precedence and the failure fallback.
function runSite({locale='en',saved=null,fetchOk=true}){
 const store=new Map(saved?[['premium-currency',saved]]:[]);const fetched=[];const listeners={};
 const el=(extra={})=>new Proxy({value:'USD',textContent:'',dataset:{},classList:{toggle(){},add(){},remove(){},contains(){return false}},style:{},options:[],elements:{},addEventListener(t,f){listeners[t]=f},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return el()},querySelectorAll(){return []},closest(){return null},focus(){},remove(){},...extra},{get(t,k){return k in t?t[k]:undefined},set(t,k,v){t[k]=v;return true}});
 const currency=el();const amount=el({dataset:{price:'compact'},textContent:'USD 450–800'});
 const data={locale,page:'',words:{menu:'Menu',close:'Close',fxUpdated:'Updated',fxUnavailable:'Unavailable'},basePrices:displayEntries(),campaign:null};
 const document={getElementById:id=>id==='site-data'?el({textContent:JSON.stringify(data)}):null,querySelector:s=>s==='#currency'?currency:s==='.enquiry-form'?null:el(),querySelectorAll:s=>s==='[data-price]'?[amount]:[],addEventListener(){}};
 const window={};const ctx={window,document,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{search:'',hash:'',assign(){}},fetch:async url=>{fetched.push(url);if(!fetchOk)return {ok:false};const c=new URL(url,'https://x').searchParams.get('currency');return {ok:true,json:async()=>({currency:c,date:new Date().toISOString(),prices:{compact:{min:c==='USD'?450:450*(c==='VND'?25000:.9),max:c==='USD'?800:800*(c==='VND'?25000:.9),plus:false}}})}},Intl,Date,URL,URLSearchParams,JSON,Math,Number,String,Object,Array,Error,Promise,console,setTimeout,IntersectionObserver:undefined};
 vm.runInNewContext(fs.readFileSync(new URL('../public/premium/site.js',import.meta.url),'utf8'),ctx);
 return {store,fetched,currency,amount,flush:()=>new Promise(r=>setTimeout(r,20))};
}
test('currency precedence: a saved choice wins; Vietnamese pages default to VND without saving it',async()=>{
 let s=runSite({locale:'vi',saved:'EUR'});await s.flush();assert.ok(s.fetched[0].includes('currency=EUR'));assert.equal(s.store.get('premium-currency'),'EUR');
 s=runSite({locale:'vi'});await s.flush();assert.ok(s.fetched[0].includes('currency=VND'));assert.equal(s.store.has('premium-currency'),false);assert.equal(s.currency.value,'VND');assert.ok(s.amount.textContent.startsWith('≈ VND'));
 s=runSite({locale:'en'});await s.flush();assert.equal(s.fetched.length,0);
 s=runSite({locale:'vi',fetchOk:false});await s.flush();assert.equal(s.currency.value,'USD');assert.equal(s.amount.textContent,'USD 450–800');assert.equal(s.store.has('premium-currency'),false);
});

test('price caches never outlive the campaign window',()=>{
 assert.equal(priceCacheSeconds(new Date('2026-11-29T23:30:00+07:00')),1800);
 assert.equal(priceCacheSeconds(new Date('2026-11-29T23:59:59+07:00')),1);
 assert.equal(priceCacheSeconds(new Date('2026-11-10T10:00:00+07:00')),3600);
 assert.equal(priceCacheSeconds(new Date('2026-12-02T10:00:00+07:00')),3600);
});

test('FAQ prices come from the catalogue and convert with the rest of the page',()=>{
 for(const loc of Object.keys(dictionaries)){const html=renderPage('swift',loc,'');assert.ok(!/\{(fix|store)\}/.test(html),loc);assert.ok(html.includes('data-price="from:swift:fix"'),loc);assert.ok(html.includes('data-price="from:swift:commerce"'),loc)}
});

test('Vietnamese promo prices carry the offer conditions beside them',()=>{
 const html=renderPage('swift','vi','services/care');
 if(campaignActive(danang,new Date())){assert.ok(html.includes('promo-terms'));assert.ok(html.includes('30/11/2026'));assert.ok(html.includes('12 tháng'))}
 assert.ok(!renderPage('swift','en','services/care').includes('promo-price'));
});
