/* Basic opt-in analytics. No Google code is loaded until a visitor agrees. */
(()=>{
  'use strict';
  if(window.premiumAnalytics)return;
  const dataEl=document.getElementById('site-data');
  if(!dataEl)return;
  const data=JSON.parse(dataEl.textContent),config=data.analytics;
  if(!config || !/^G-[A-Z0-9]{6,20}$/.test(config.measurementId))return;
  const id=config.measurementId,key='premium-analytics-v1',ttl=180*24*60*60*1000;
  const panel=document.querySelector('.analytics-panel'),status=panel?.querySelector('.analytics-status');
  const accept=panel?.querySelector('[data-analytics-action="accept"]');
  const reject=panel?.querySelector('[data-analytics-action="reject"]');
  const disable=panel?.querySelector('[data-analytics-action="disable"]');
  const close=panel?.querySelector('[data-analytics-action="close"]');
  const settings=document.querySelector('[data-analytics-settings]');
  const validLocale=['en','vi','ru','zh-Hans','es','fr','ko','ja','af'].includes(data.locale);
  const productionHost={swift:'www.swiftsites.nz',stack:'stackcraft.co.nz'}[data.brand];
  const production=location.protocol==='https:' && location.hostname===productionHost;
  const knownPage=config.pageLocation?.startsWith('https://'+productionHost+'/') && !/[?#]/.test(config.pageLocation);
  let choice=null,choiceTime=0,started=false,viewed=false,returnFocus=null;
  function storedChoice(){
    let raw;
    try{raw=localStorage.getItem(key)}catch{return undefined}
    try{
      const saved=JSON.parse(raw||'null');
      return saved && ['granted','denied'].includes(saved.choice) && Number.isFinite(saved.time) && saved.time<=Date.now() && Date.now()-saved.time<ttl ? saved : null;
    }catch{return null}
  }
  const initial=storedChoice();
  if(initial){choice=initial.choice;choiceTime=initial.time}
  window['ga-disable-'+id]=choice!=='granted';

  function command(){window.dataLayer.push(arguments)}
  function consent(value){return {analytics_storage:value,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}}
  function pageContext(){
    // Use renderer-owned route/title, never the query, hash, form input or raw referrer.
    let referrer='';
    try {const url=new URL(document.referrer);if(['http:','https:'].includes(url.protocol))referrer=url.origin+'/'}catch{}
    return {page_location:config.pageLocation,page_title:config.pageTitle,page_referrer:referrer};
  }
  function start(){
    if(choice!=='granted' || !production || !knownPage || !validLocale)return;
    window['ga-disable-'+id]=false;
    if(!started){
      started=true;
      window.dataLayer=window.dataLayer||[];
      command('consent','default',consent('denied'));
      command('set',{...pageContext(),allow_google_signals:false,allow_ad_personalization_signals:false,ads_data_redaction:true,url_passthrough:false});
      command('js',new Date());
      command('consent','update',consent('granted'));
      command('config',id,{...pageContext(),send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:ttl/1000,cookie_flags:'SameSite=Lax;Secure'});
      const script=document.createElement('script');
      script.id='premium-google-tag';script.async=true;
      script.src='https://www.googletagmanager.com/gtag/js?id='+id;
      document.head.appendChild(script);
    }else command('consent','update',consent('granted'));
    if(!viewed){viewed=true;command('event','page_view',{...pageContext(),send_to:id,site_brand:data.brand,site_language:data.locale})}
  }
  function clearAnalyticsCookies(){
    // GA cookies use the root path and may be host-only or on the parent domain.
    const names=document.cookie.split(';').map(part=>part.trim().split('=')[0]).filter(name=>/^_ga(?:_|$)/.test(name));
    const labels=location.hostname.split('.');
    const domains=[''];for(let i=0;i<labels.length-1;i++)domains.push(labels.slice(i).join('.'));
    for(const name of names)for(const domain of domains){
      document.cookie=name+'=; Max-Age=0; Path=/; SameSite=Lax'+(domain?'; Domain='+domain:'');
    }
  }
  function stop(){
    const wasEnabled=window['ga-disable-'+id]!==true;
    window['ga-disable-'+id]=true;
    if(started && wasEnabled)command('consent','update',consent('denied'));
    clearAnalyticsCookies();
  }
  function paint(opened=false){
    if(!panel)return;
    panel.hidden=!opened && choice!==null;
    status.textContent=choice==='granted'?data.words.analyticsStatusOn:choice==='denied'?data.words.analyticsStatusOff:'';
    status.hidden=choice===null;
    accept.hidden=choice==='granted';reject.hidden=choice!==null;
    disable.hidden=choice!=='granted';close.hidden=choice===null;
  }
  function choose(next){
    choice=next;choiceTime=Date.now();
    try{localStorage.setItem(key,JSON.stringify({choice,time:choiceTime}))}catch{}
    if(choice==='granted')start();else stop();
    paint();returnFocus?.focus();returnFocus=null;
  }
  panel?.addEventListener('click',event=>{
    const action=event.target.closest('[data-analytics-action]')?.dataset.analyticsAction;
    if(action==='accept')choose('granted');
    if(action==='reject'||action==='disable')choose('denied');
    if(action==='close'){paint();returnFocus?.focus();returnFocus=null}
  });
  settings?.addEventListener('click',()=>{
    returnFocus=settings;paint(true);
    panel.scrollIntoView({block:'center',behavior:'instant'});
    panel.querySelector('h2').focus({preventScroll:true});
  });
  window.addEventListener('storage',event=>{
    if(event.key!==key && event.key!==null)return;
    // Another tab revoking or clearing consent must stop this tab as well.
    try{const saved=JSON.parse(event.newValue||'null');if(saved?.choice==='denied'||!saved){choice='denied';stop();paint()}}catch{choice='denied';stop();paint()}
  });
  function currentConsent(){
    // A cached page may have missed a storage event. Re-read before sending.
    // Only an unavailable store preserves a choice made in this document.
    const saved=storedChoice();
    if(saved!==undefined){choice=saved?.choice??null;choiceTime=saved?.time??0}
    if(choice==='granted' && (Date.now()-choiceTime>=ttl || choiceTime>Date.now()))choice=null;
    if(choice!=='granted'){stop();paint()}
    return choice==='granted';
  }
  window.addEventListener('pageshow',event=>{
    // Native anchors make real page loads; a back/forward-cache restore is a new view too.
    if(event.persisted && currentConsent()){viewed=false;start()}
  });
  window.premiumAnalytics=Object.freeze({
    lead(input={}){
      if(!currentConsent()||!started||window['ga-disable-'+id]||!validLocale)return;
      const fields={...pageContext(),send_to:id,site_brand:data.brand,site_language:data.locale,form_type:input.onsite===true?'on_site':'contact'};
      if(config.services.includes(input.service))fields.service_type=input.service;
      if(data.locale==='vi' && new URLSearchParams(location.search).get('offer')==='danang-2026')fields.offer_id='danang-2026';
      command('event','generate_lead',fields);
    }
  });
  if(choice==='granted')start();else stop();
  paint();
})();
