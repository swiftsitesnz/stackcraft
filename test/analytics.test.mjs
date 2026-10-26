import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {measurementId} from '../premium/analytics.mjs';
import {renderPage,languages} from '../premium/render.mjs';

const source=fs.readFileSync(new URL('../public/premium/analytics.js',import.meta.url),'utf8');
const id='G-TEST123456'; // Synthetic unit-test fixture; never written into the site config.
const key='premium-analytics-v1';
function harness({saved,brand='swift',hostname=brand==='swift'?'www.swiftsites.nz':'stackcraft.co.nz',locale='vi',page='contact',idValue=id,storageThrows=false}={}){
  const callbacks={},scripts=[],store=new Map(saved===undefined?[]:[[key,JSON.stringify(saved)]]),cookies=new Map();
  let now=1800000000000;
  const makeNode=()=>({hidden:false,textContent:'',focus(){this.focused=true},scrollIntoView(){},addEventListener(type,fn){this[type]=fn}});
  const nodes=Object.fromEntries(['accept','reject','disable','close','status','heading','settings'].map(name=>[name,makeNode()]));
  const panel=makeNode();panel.querySelector=selector=>selector==='h2'?nodes.heading:selector==='.analytics-status'?nodes.status:nodes[selector.match(/"([^"]+)"/)[1]];
  const data={brand,locale,page,words:{analyticsStatusOn:'On',analyticsStatusOff:'Off'},analytics:{measurementId:idValue,pageLocation:'https://'+(brand==='swift'?'www.swiftsites.nz':'stackcraft.co.nz')+'/'+(locale==='en'?'':locale+'/')+page,pageTitle:'Contact — SwiftSites',services:brand==='swift'?['web','commerce','care']:['app','ai','automation']}};
  const document={referrer:'https://search.example/private-person?email=person@example.test',getElementById:()=>({textContent:JSON.stringify(data)}),querySelector:selector=>selector==='.analytics-panel'?panel:nodes.settings,createElement:()=>({}),head:{appendChild(script){scripts.push(script)}}};
  Object.defineProperty(document,'cookie',{get:()=>[...cookies].map(([k,v])=>k+'='+v).join('; '),set(value){const [part]=value.split(';');const [k,v]=part.split('=');if(value.includes('Max-Age=0'))cookies.delete(k);else cookies.set(k,v)}});
  const localStorage={getItem(k){if(storageThrows)throw Error('disabled');return store.get(k)??null},setItem(k,v){if(storageThrows)throw Error('disabled');store.set(k,v)}};
  class Clock extends Date{static now(){return now}}
  const window={addEventListener(type,fn){callbacks[type]=fn}};
  const ctx=vm.createContext({window,document,localStorage,location:{protocol:'https:',hostname,search:'?offer=danang-2026&email=person@example.test#secret'},URL,URLSearchParams,Date:Clock});
  vm.runInContext(source,ctx);
  const commands=()=>JSON.parse(JSON.stringify((window.dataLayer||[]).map(args=>Array.from(args))));
  return {window,nodes,panel,scripts,store,cookies,commands,data,callbacks,rerun:()=>vm.runInContext(source,ctx),advance:n=>now+=n,click(action){panel.click({target:{closest:()=>({dataset:{analyticsAction:action}})}})}};
}

test('measurement IDs are optional public identifiers and malformed values stop the build',()=>{
  assert.equal(measurementId('swift',{GA4_SWIFT_MEASUREMENT_ID:''}),'');
  assert.equal(measurementId('swift',{GA4_SWIFT_MEASUREMENT_ID:id}),id);
  assert.throws(()=>measurementId('swift',{GA4_SWIFT_MEASUREMENT_ID:'G-123<script>'}));
});
test('no consent, rejection, expired consent and blocked storage never load Google or send commands',()=>{
  for(const saved of [undefined,{choice:'denied',time:1800000000000},{choice:'granted',time:0},{choice:'granted',time:1900000000000}]){
    const h=harness({saved});assert.equal(h.scripts.length,0);assert.deepEqual(h.commands(),[]);h.window.premiumAnalytics.lead({service:'web'});assert.deepEqual(h.commands(),[]);
  }
  const h=harness({storageThrows:true});assert.equal(h.scripts.length,0);h.click('reject');assert.equal(h.scripts.length,0);assert.equal(h.panel.hidden,true);
  const denied=harness();denied.click('reject');assert.equal(JSON.parse(denied.store.get(key)).choice,'denied');
});
test('one opt-in loads one script and one sanitized page view, with all advertising denied',()=>{
  const h=harness();h.click('accept');h.click('accept');h.rerun();
  assert.equal(h.scripts.length,1);assert.equal(h.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id='+id);
  const commands=h.commands(),views=commands.filter(c=>c[0]==='event'&&c[1]==='page_view');assert.equal(views.length,1);
  assert.equal(views[0][2].page_location,'https://www.swiftsites.nz/vi/contact');assert.equal(views[0][2].page_referrer,'https://search.example/');
  assert.equal(commands[0][0],'consent');assert.equal(commands[0][2].analytics_storage,'denied');
  for(const c of commands.filter(c=>c[0]==='consent'))for(const key of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(c[2][key],'denied');
  const config=commands.find(c=>c[0]==='config')[2];assert.equal(config.send_page_view,false);assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);
  assert.ok(!JSON.stringify(commands).includes('person@example.test'));assert.ok(!JSON.stringify(commands).includes('private-person'));
});
test('preview hosts and invalid IDs never collect, even after an opt-in',()=>{
  const h=harness({hostname:'localhost'});h.click('accept');h.window.premiumAnalytics.lead({service:'web'});assert.equal(h.scripts.length,0);assert.deepEqual(h.commands(),[]);
  const empty=harness({idValue:''});assert.equal(empty.window.premiumAnalytics,undefined);assert.equal(empty.scripts.length,0);
});
test('lead payload is an allowlist: no names, emails, messages, budget or arbitrary service',()=>{
  const h=harness();h.click('accept');h.window.premiumAnalytics.lead({service:'web',onsite:true,name:'Secret Name',email:'person@example.test',message:'secret brief',budget:'private budget'});
  const lead=h.commands().find(c=>c[1]==='generate_lead')[2];
  assert.deepEqual(Object.keys(lead).sort(),['page_location','page_title','page_referrer','send_to','site_brand','site_language','form_type','service_type','offer_id'].sort());
  assert.equal(lead.form_type,'on_site');assert.equal(lead.offer_id,'danang-2026');assert.equal(lead.service_type,'web');
  h.window.premiumAnalytics.lead({service:'person@example.test',onsite:'private text'});
  const last=h.commands().at(-1)[2];assert.equal(last.service_type,undefined);assert.equal(last.form_type,'contact');
  assert.ok(!JSON.stringify(h.commands()).includes('Secret Name'));assert.ok(!JSON.stringify(h.commands()).includes('person@example.test'));
});
test('revocation clears GA cookies, disables further leads, and can be reopened without duplicate tags',()=>{
  const h=harness();h.click('accept');h.cookies.set('_ga','123');h.cookies.set('_ga_TEST123456','456');h.cookies.set('necessary','keep');h.nodes.settings.click();assert.equal(h.panel.hidden,false);
  h.click('disable');assert.equal(h.window['ga-disable-'+id],true);assert.equal(h.cookies.has('_ga'),false);assert.equal(h.cookies.has('_ga_TEST123456'),false);assert.equal(h.cookies.get('necessary'),'keep');
  const count=h.commands().length;h.window.premiumAnalytics.lead({service:'web'});assert.equal(h.commands().length,count);
  h.nodes.settings.click();assert.equal(h.nodes.status.textContent,'Off');h.click('accept');assert.equal(h.scripts.length,1);assert.equal(h.commands().filter(c=>c[1]==='page_view').length,1);
});
test('cross-tab revocation, consent expiry and back/forward page restoration are handled',()=>{
  const h=harness({saved:{choice:'granted',time:1800000000000}});assert.equal(h.commands().filter(c=>c[1]==='page_view').length,1);
  h.callbacks.pageshow({persisted:true});assert.equal(h.commands().filter(c=>c[1]==='page_view').length,2);
  h.callbacks.storage({key,newValue:JSON.stringify({choice:'denied',time:1800000000000})});assert.equal(h.window['ga-disable-'+id],true);
  h.click('accept');h.advance(181*24*60*60*1000);h.window.premiumAnalytics.lead({service:'web'});assert.equal(h.window['ga-disable-'+id],true);assert.equal(h.commands().filter(c=>c[1]==='generate_lead').length,0);
});
test('cached pages re-read consent even when a storage event was missed',()=>{
  for(const value of [null,JSON.stringify({choice:'denied',time:1800000000000}),'{invalid']){
    const h=harness({saved:{choice:'granted',time:1800000000000}});
    if(value===null)h.store.delete(key);else h.store.set(key,value);
    h.callbacks.pageshow({persisted:true});h.window.premiumAnalytics.lead({service:'web'});
    assert.equal(h.window['ga-disable-'+id],true);assert.equal(h.commands().filter(c=>c[1]==='page_view').length,1);assert.equal(h.commands().filter(c=>c[1]==='generate_lead').length,0);
  }
  const denied=harness({storageThrows:true});denied.click('accept');denied.window.premiumAnalytics.lead({service:'web'});assert.equal(denied.commands().filter(c=>c[1]==='generate_lead').length,1);
});
test('configured controls and privacy disclosure render in all nine locales; blank IDs render neither',()=>{
  const previous=process.env.GA4_SWIFT_MEASUREMENT_ID;
  try {
    process.env.GA4_SWIFT_MEASUREMENT_ID='';assert.ok(!renderPage('swift','en','').includes('data-analytics-settings'));
    process.env.GA4_SWIFT_MEASUREMENT_ID=id;
    for(const locale of Object.keys(languages)){
      const html=renderPage('swift',locale,'privacy');assert.ok(html.includes('data-analytics-settings'));assert.ok(html.includes('data-analytics-action="reject"'));assert.ok(!html.includes('undefined'));
      const data=JSON.parse(html.match(/id="site-data">(.*?)<\/script>/s)[1]);assert.equal(data.analytics.measurementId,id);assert.equal(data.analytics.pageLocation,`https://www.swiftsites.nz/${locale==='en'?'':locale+'/'}privacy`);
    }
    assert.ok(!renderPage('swift','en','not-found').includes('data-analytics-settings'));
  }finally{if(previous===undefined)delete process.env.GA4_SWIFT_MEASUREMENT_ID;else process.env.GA4_SWIFT_MEASUREMENT_ID=previous}
});

test('Stackcraft uses its own production host, service allowlist and page context',()=>{
 const h=harness({brand:'stack'});h.click('accept');h.window.premiumAnalytics.lead({service:'app'});
 const lead=h.commands().find(c=>c[1]==='generate_lead')[2];assert.equal(lead.site_brand,'stack');assert.equal(lead.service_type,'app');assert.equal(lead.page_location,'https://stackcraft.co.nz/vi/contact');
 const wrongHost=harness({brand:'stack',hostname:'www.swiftsites.nz'});wrongHost.click('accept');assert.equal(wrongHost.scripts.length,0);
});
