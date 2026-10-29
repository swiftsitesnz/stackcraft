// Pricing rules shared by both brands. Pure functions over catalogue.json:
// products, pages, groups, campaign eligibility and promotional arithmetic.
// Discounts are applied to USD amounts before any currency conversion.
import catalogue from './catalogue.json' with {type:'json'};

export {catalogue};
export const CURRENCIES=['USD','EUR','NZD','AUD','VND'];

const byMin=(a,b)=>a.min-b.min||a.max-b.max;
export const offersFor=brand=>catalogue.offers.filter(o=>o.brand===brand);
export const productById=id=>catalogue.offers.find(o=>o.id===id)||catalogue.scenarios.find(o=>o.id===id)||null;
export const pagesFor=brand=>[...new Set(offersFor(brand).map(o=>o.page))];
export const productsOnPage=(brand,page)=>offersFor(brand).filter(o=>o.page===page).sort(byMin);
export const groupsFor=brand=>catalogue.groups.filter(g=>g.brand===brand).map(g=>({...g,products:offersFor(brand).filter(o=>o.group===g.id).sort(byMin)}));
export const budgetsFor=brand=>catalogue.budgets[brand]||[];
export const budgetIds=brand=>[...budgetsFor(brand).map(b=>b.id),...catalogue.budgets.extra];

// The lowest entry price on a page or in a group, used for "From USD …" lines.
export function fromAmount(products){const list=products.filter(Boolean);if(!list.length)return null;const o=list.reduce((a,b)=>a.min<=b.min?a:b);return {min:o.min,max:o.min,unit:o.unit}}

export const campaignById=id=>(catalogue.campaigns||[]).find(c=>c.id===id)||null;
export function campaignActive(campaign,now=new Date()){
 if(!campaign||campaign.status==='withdrawn')return false;
 const t=now instanceof Date?now.getTime():Number(now);
 return t>=Date.parse(campaign.startsAt)&&t<Date.parse(campaign.endsAt);
}
export const campaignEligible=(campaign,product)=>!!campaign&&!!product&&campaign.eligible.includes(product.id);

// Exact USD arithmetic in cents, so USD 349 → USD 174.50 rather than a rounded 175.
const cents=v=>Math.round(v*100)/100;
export function promotionalRange(product,campaign){
 if(!campaignEligible(campaign,product))return null;
 const f=1-campaign.discount;
 return {min:cents(product.min*f),max:cents(product.max*f),plus:!!product.plus,unit:product.unit};
}

// Monthly charges for a recurring plan signed during the campaign: the discount
// lasts at most `recurringMonths` from signing, then the agreed standard rate applies.
// It never restarts at renewal and never runs beyond the plan's own length.
// The product must be passed, so entry products (not on the eligible list) are never discounted here.
export function recurringCharges(monthlyStandard,campaign,months,product=null){
 const promoMonths=campaignEligible(campaign,product)?Math.min(campaign.recurringMonths,months):0;
 const promo=cents(monthlyStandard*(1-(campaign?campaign.discount:0)));
 return Array.from({length:months},(_,i)=>i<promoMonths?promo:monthlyStandard);
}

// Every amount the site can display, keyed for data-price attributes.
// Base products and scenarios use their id; promotional amounts use `id~campaign`;
// "from" amounts use `from:<brand>:<page|group>`; budget bands use `budget:<brand>:<id>`.
export function displayEntries(now=new Date()){
 const out={};
 for(const o of [...catalogue.offers,...catalogue.scenarios])out[o.id]={min:o.min,max:o.max,plus:!!o.plus};
 for(const c of catalogue.campaigns||[]){if(!campaignActive(c,now))continue;for(const o of catalogue.offers){const p=promotionalRange(o,c);if(p)out[o.id+'~'+c.id]={min:p.min,max:p.max,plus:p.plus}}}
 for(const brand of ['swift','stack']){
  for(const page of pagesFor(brand)){const f=fromAmount(productsOnPage(brand,page));if(f)out[`from:${brand}:${page}`]={min:f.min,max:f.max,plus:false,from:true}}
  for(const g of groupsFor(brand)){const f=fromAmount(g.products);if(f)out[`from:${brand}:group-${g.id}`]={min:f.min,max:f.max,plus:false,from:true}}
  for(const b of budgetsFor(brand))out[`budget:${brand}:${b.id}`]={min:b.min,max:b.max,plus:!!b.plus,upTo:!!b.upTo};
 }
 return out;
}

// USD text: whole numbers without decimals, fractional amounts with two (174.50).
export function formatUSDNumber(v,locale='en'){const whole=Math.abs(v-Math.round(v))<1e-9;return new Intl.NumberFormat(locale,whole?{maximumFractionDigits:0}:{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)}
export function formatUSDRange(p,locale='en',upToLabel='Up to'){const min=formatUSDNumber(p.min,locale);if(p.upTo)return upToLabel+' USD '+min;return 'USD '+min+(p.max!==p.min?'–'+formatUSDNumber(p.max,locale):'')+(p.plus?'+':'')}

// Shared caches of converted prices must not outlive an open campaign window.
export function priceCacheSeconds(now=new Date(),max=3600){
 let s=max;for(const c of catalogue.campaigns||[])if(campaignActive(c,now))s=Math.min(s,Math.floor((new Date(c.endsAt)-now)/1000));
 return Math.max(0,s);
}
