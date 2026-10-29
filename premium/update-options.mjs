import copy from './update-options-locales.json' with {type:'json'};

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function updateOptions({locale,path,carePrice,onCare=false}){
 const words=copy[locale];
 if(!words)throw new Error('Missing update-options locale: '+locale);
 const t=key=>escape(words[key]);
 return `<section class="update-options" id="website-updates" aria-labelledby="update-options-heading"><div class="shell">
  <div class="update-options-heading"><h2 id="update-options-heading">${t('heading')}</h2><p>${t('intro')}</p></div>
  <div class="update-options-grid">
   <article class="update-option"><div class="update-option-title"><span aria-hidden="true">01</span><h3>${t('managedTitle')}</h3></div><p>${t('managedBody')}</p>${onCare?'':`<div class="update-option-price">${carePrice}</div>`}<p>${t('managedIncluded')}</p><p class="update-option-small">${t('managedLimit')}</p>${onCare?'':`<a class="inline-link" href="${path('services/care')}">${t('managedLink')} <span aria-hidden="true">↗</span></a>`}</article>
   <article class="update-option"><div class="update-option-title"><span aria-hidden="true">02</span><h3>${t('selfTitle')}</h3></div><p>${t('selfBody')}</p><p class="update-option-example">${t('example')}</p><div class="update-option-fees"><p>${t('setup')}</p><p>${t('subscription')}</p></div><p class="update-option-small">${t('software')}</p></article>
  </div>
  <div class="update-options-footer"><p>${t('costs')}</p><a class="button" href="${path('contact')}?topic=self-editing&amp;service=web">${t('enquiry')} <span aria-hidden="true">↗</span></a></div>
 </div></section>`;
}
