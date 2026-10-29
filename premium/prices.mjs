import catalogue from './catalogue.json' with {type:'json'};
import {displayEntries,CURRENCIES} from './pricing.mjs';
let cached=null;let inflight=null;
// Rates come from the provider at request time; nothing is hardcoded. USD is canonical:
// discounts are applied to USD first (pricing.mjs), then each amount is converted once.
export async function convertedCatalogue(currency='USD',fetcher=fetch,now=new Date()){
 if(!CURRENCIES.includes(currency))throw new Error('Unsupported currency');
 let rate=1,date=null;
 if(currency!=='USD'){
  const t=now.getTime();
  if(!cached||t-cached.fetched>86400000||t-new Date(cached.date).getTime()>172800000){
   if(!inflight)inflight=(async()=>{const r=await fetcher('https://open.er-api.com/v6/latest/USD',{signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Rate provider unavailable');const data=await r.json();if(data.result!=='success'||data.base_code!=='USD'||!Number.isFinite(data.time_last_update_unix))throw Error('Invalid rates');const updated=data.time_last_update_unix*1000;if(updated>t+3600000||t-updated>172800000)throw Error('Stale rates');for(const c of ['EUR','NZD','AUD','VND'])if(!Number.isFinite(data.rates[c])||data.rates[c]<=0)throw Error('Invalid rate');cached={rates:data.rates,date:new Date(updated).toISOString(),fetched:t};return cached;})().finally(()=>{inflight=null});
   try{await inflight}catch(e){if(!cached||t-new Date(cached.date).getTime()>172800000)throw e}
  }
  rate=cached.rates[currency];date=cached.date;
 }
 const conv=v=>currency==='USD'?v:Math.round(v*rate);
 const entries=displayEntries(now);
 return {currency,date,version:catalogue.version,prices:Object.fromEntries(Object.entries(entries).map(([id,p])=>[id,{min:conv(p.min),max:conv(p.max),plus:!!p.plus,...(p.upTo?{upTo:true}:{}),...(p.from?{from:true}:{})}]))};
}
