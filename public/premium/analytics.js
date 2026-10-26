/* Basic site analytics. Starts automatically on the configured production host. */
(()=>{
  'use strict';
  if(window.premiumAnalytics)return;
  const dataEl=document.getElementById('site-data');
  if(!dataEl)return;
  const data=JSON.parse(dataEl.textContent),config=data.analytics;
  if(!config || !/^G-[A-Z0-9]{6,20}$/.test(config.measurementId))return;
  const id=config.measurementId,cookieLifetime=180*24*60*60;
  const validLocale=['en','vi','ru','zh-Hans','es','fr','ko','ja','af'].includes(data.locale);
  const productionHost={swift:'www.swiftsites.nz',stack:'stackcraft.co.nz'}[data.brand];
  const production=location.protocol==='https:' && location.hostname===productionHost;
  const knownPage=config.pageLocation?.startsWith('https://'+productionHost+'/') && !/[?#]/.test(config.pageLocation);
  let started=false;
  function command(){window.dataLayer.push(arguments)}
  function enabled(){return started && !window['ga-disable-'+id]}
  function pageContext(){
    // Renderer-owned route/title only; never query, hash, form input or raw referrer.
    let referrer='';
    try {const url=new URL(document.referrer);if(['http:','https:'].includes(url.protocol))referrer=url.origin+'/'}catch{}
    return {page_location:config.pageLocation,page_title:config.pageTitle,page_referrer:referrer};
  }
  function pageView(){
    if(enabled())command('event','page_view',{...pageContext(),send_to:id,site_brand:data.brand,site_language:data.locale});
  }
  function start(){
    if(started || !production || !knownPage || !validLocale || window['ga-disable-'+id])return;
    started=true;
    window.dataLayer=window.dataLayer||[];
    command('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    command('set',{...pageContext(),allow_google_signals:false,allow_ad_personalization_signals:false,ads_data_redaction:true,url_passthrough:false});
    command('js',new Date());
    command('config',id,{...pageContext(),send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:cookieLifetime,cookie_flags:'SameSite=Lax;Secure'});
    const script=document.createElement('script');
    script.id='premium-google-tag';script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+id;
    document.head.appendChild(script);
    pageView();
  }
  window.addEventListener('pageshow',event=>{
    // Native navigation loads a new document; a cache restore is one new view.
    if(event.persisted)pageView();
  });
  window.premiumAnalytics=Object.freeze({
    lead(input={}){
      if(!enabled())return;
      const fields={...pageContext(),send_to:id,site_brand:data.brand,site_language:data.locale,form_type:input.onsite===true?'on_site':'contact'};
      if(Array.isArray(config.services) && config.services.includes(input.service))fields.service_type=input.service;
      if(data.locale==='vi' && new URLSearchParams(location.search).get('offer')==='danang-2026')fields.offer_id='danang-2026';
      command('event','generate_lead',fields);
    }
  });
  start();
})();
