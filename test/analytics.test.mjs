import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {measurementId} from '../premium/analytics.mjs';
import {renderPage,languages} from '../premium/render.mjs';
import dictionaries from '../premium/dictionaries.json' with {type:'json'};

const source=fs.readFileSync(new URL('../public/premium/analytics-4aaed0be9cea.js',import.meta.url),'utf8');
const id='G-TEST123456'; // Synthetic fixture, never written into the site config.
function harness({brand='swift',hostname=brand==='swift'?'www.swiftsites.nz':'stackcraft.co.nz',protocol='https:',locale='vi',page='contact',idValue=id,pageLocation,disabled=false}={}){
  const callbacks={},scripts=[];
  const data={brand,locale,page,analytics:{measurementId:idValue,pageLocation:pageLocation??'https://'+(brand==='swift'?'www.swiftsites.nz':'stackcraft.co.nz')+'/'+(locale==='en'?'':locale+'/')+page,pageTitle:'Contact — SwiftSites',services:brand==='swift'?['web','commerce','care']:['app','ai','automation']}};
  const document={referrer:'https://search.example/private-person?email=person@example.test',getElementById:()=>({textContent:JSON.stringify(data)}),querySelector(){throw Error('Analytics must not depend on interface controls')},createElement:()=>({}),head:{appendChild(script){scripts.push(script)}}};
  const localStorage={getItem(){throw Error('No consent store is used')},setItem(){throw Error('No consent store is used')}};
  const window={['ga-disable-'+idValue]:disabled,addEventListener(type,fn){callbacks[type]=fn}};
  const ctx=vm.createContext({window,document,localStorage,location:{protocol,hostname,search:'?offer=danang-2026&email=person@example.test#secret'},URL,URLSearchParams,Date});
  vm.runInContext(source,ctx);
  const commands=()=>JSON.parse(JSON.stringify((window.dataLayer||[]).map(args=>Array.from(args))));
  return {window,scripts,commands,data,callbacks,rerun:()=>vm.runInContext(source,ctx)};
}

test('measurement IDs remain optional public identifiers; malformed values fail validation',()=>{
  assert.equal(measurementId('swift',{GA4_SWIFT_MEASUREMENT_ID:''}),'');
  assert.equal(measurementId('swift',{GA4_SWIFT_MEASUREMENT_ID:id}),id);
  assert.throws(()=>measurementId('swift',{GA4_SWIFT_MEASUREMENT_ID:'G-123<script>'}));
});
test('automatic startup loads one tag and one sanitized view without controls or storage',()=>{
  const h=harness();h.rerun();h.callbacks.pageshow({persisted:false});
  assert.equal(h.scripts.length,1);assert.equal(h.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id='+id);
  const views=h.commands().filter(c=>c[0]==='event'&&c[1]==='page_view');assert.equal(views.length,1);
  assert.equal(views[0][2].page_location,'https://www.swiftsites.nz/vi/contact');assert.equal(views[0][2].page_referrer,'https://search.example/');
  assert.ok(!JSON.stringify(h.commands()).includes('person@example.test'));assert.ok(!JSON.stringify(h.commands()).includes('private-person'));
});
test('analytics collection never enables advertising or Google Signals',()=>{
  const commands=harness().commands();const consent=commands.find(c=>c[0]==='consent')[2];assert.equal(consent.analytics_storage,'granted');
  for(const key of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(consent[key],'denied');
  const config=commands.find(c=>c[0]==='config')[2];assert.equal(config.send_page_view,false);assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);
  const settings=commands.find(c=>c[0]==='set')[1];assert.equal(settings.url_passthrough,false);assert.equal(settings.ads_data_redaction,true);
});
test('preview hosts, HTTP, unknown locales and unsafe route URLs never collect',()=>{
  for(const settings of [{hostname:'localhost'},{hostname:'preview.vercel.app'},{protocol:'http:'},{locale:'not-a-language'},{pageLocation:'https://www.swiftsites.nz/contact?email=secret'},{pageLocation:'https://www.swiftsites.nz/contact#secret'},{pageLocation:'https://other.example/contact'}]){
    const h=harness(settings);h.window.premiumAnalytics.lead({service:'web'});h.callbacks.pageshow({persisted:true});assert.equal(h.scripts.length,0);assert.deepEqual(h.commands(),[]);
  }
  const empty=harness({idValue:''});assert.equal(empty.window.premiumAnalytics,undefined);assert.equal(empty.scripts.length,0);
});
test('lead payload excludes names, emails, messages, budgets and arbitrary service values',()=>{
  const h=harness();h.window.premiumAnalytics.lead({service:'web',onsite:true,name:'Secret Name',email:'person@example.test',message:'secret brief',budget:'private budget'});
  const lead=h.commands().find(c=>c[1]==='generate_lead')[2];
  assert.deepEqual(Object.keys(lead).sort(),['page_location','page_title','page_referrer','send_to','site_brand','site_language','form_type','service_type','offer_id'].sort());
  assert.equal(lead.form_type,'on_site');assert.equal(lead.offer_id,'danang-2026');assert.equal(lead.service_type,'web');
  h.window.premiumAnalytics.lead({service:'person@example.test',onsite:'private text'});
  const last=h.commands().at(-1)[2];assert.equal(last.service_type,undefined);assert.equal(last.form_type,'contact');
  for(const secret of ['Secret Name','person@example.test','secret brief','private budget'])assert.ok(!JSON.stringify(h.commands()).includes(secret));
  const en=harness({locale:'en'});en.window.premiumAnalytics.lead();assert.equal(en.commands().at(-1)[2].offer_id,undefined);
});
test('back-forward-cache restore emits one new view without a duplicate loader',()=>{
  const h=harness();h.callbacks.pageshow({persisted:false});assert.equal(h.commands().filter(c=>c[1]==='page_view').length,1);
  h.callbacks.pageshow({persisted:true});assert.equal(h.commands().filter(c=>c[1]==='page_view').length,2);assert.equal(h.scripts.length,1);
});
test('browser-level GA disable is respected before startup and before later events',()=>{
  const disabled=harness({disabled:true});disabled.window.premiumAnalytics.lead();disabled.callbacks.pageshow({persisted:true});assert.equal(disabled.scripts.length,0);assert.deepEqual(disabled.commands(),[]);
  const h=harness();const count=h.commands().length;h.window['ga-disable-'+id]=true;h.window.premiumAnalytics.lead();h.callbacks.pageshow({persisted:true});assert.equal(h.commands().length,count);
});
test('both brands render no analytics interface in any locale and disclose automatic collection on privacy pages',()=>{
  for(const brand of ['swift','stack']){
    const key='GA4_'+brand.toUpperCase()+'_MEASUREMENT_ID',previous=process.env[key];
    try{
      process.env[key]=id;
      for(const locale of Object.keys(languages))for(const page of ['','privacy','contact']){
        const html=renderPage(brand,locale,page);assert.doesNotMatch(html,/analytics-panel|data-analytics-action|data-analytics-settings|analytics-settings/);assert.ok(!html.includes('undefined'));
        if(page==='privacy')assert.ok(html.includes(dictionaries[locale].privacyAnalytics));
        const data=JSON.parse(html.match(/id="site-data">(.*?)<\/script>/s)[1]);assert.equal(data.analytics.measurementId,id);
      }
      process.env[key]='';assert.ok(!renderPage(brand,'en','privacy').includes(dictionaries.en.privacyAnalytics));
      process.env[key]=id;const notFound=renderPage(brand,'en','not-found');const data=JSON.parse(notFound.match(/id="site-data">(.*?)<\/script>/s)[1]);assert.equal(data.analytics.measurementId,'');
    }finally{if(previous===undefined)delete process.env[key];else process.env[key]=previous}
  }
  assert.equal(dictionaries.en.privacyAnalytics,'Google Analytics uses cookies to measure page visits and successfully sent enquiries. We do not send your name, email address or enquiry message to Google Analytics.');
});
test('Stackcraft uses its own production host and service allowlist',()=>{
  const h=harness({brand:'stack'});h.window.premiumAnalytics.lead({service:'app'});
  const lead=h.commands().find(c=>c[1]==='generate_lead')[2];assert.equal(lead.site_brand,'stack');assert.equal(lead.service_type,'app');assert.equal(lead.page_location,'https://stackcraft.co.nz/vi/contact');
  const wrongHost=harness({brand:'stack',hostname:'www.swiftsites.nz'});assert.equal(wrongHost.scripts.length,0);
});

test('runtime content hash changes the asset URL and prevents reuse of the cached opt-in script',()=>{
  const expected='/premium/analytics-'+createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex').slice(0,12)+'.js';
  assert.equal(expected,'/premium/analytics-4aaed0be9cea.js');
  const build=fs.readFileSync(new URL('../scripts/build-static.mjs',import.meta.url),'utf8');
  const sources=[...build.matchAll(/src="(\/premium\/analytics[^"]*)"/g)].map(m=>m[1]);
  assert.equal(sources.length,2);assert.ok(sources.every(src=>src===expected));
  const layout=new URL('../app/[[...path]]/layout.tsx',import.meta.url);
  if(fs.existsSync(layout)){const html=fs.readFileSync(layout,'utf8');assert.ok(html.includes('src="'+expected+'"'));assert.ok(!html.includes('src="/premium/analytics.js"'))}
  const previousBrowserCache=new Map([['/premium/analytics.js','previous opt-in runtime']]);
  assert.equal(previousBrowserCache.has(expected),false);
});
