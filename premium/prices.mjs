import catalogue from './catalogue.json' with {type:'json'};
let cached=null;let inflight=null;
export async function convertedCatalogue(currency='USD',fetcher=fetch){
 if(!['USD','EUR','NZD','AUD','VND'].includes(currency))throw new Error('Unsupported currency');
 let rate=1,date=null;
 if(currency!=='USD'){
  const now=Date.now();
  if(!cached||now-cached.fetched>86400000||now-new Date(cached.date).getTime()>172800000){
   if(!inflight)inflight=(async()=>{const r=await fetcher('https://open.er-api.com/v6/latest/USD',{signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Rate provider unavailable');const data=await r.json();if(data.result!=='success'||data.base_code!=='USD'||!Number.isFinite(data.time_last_update_unix))throw Error('Invalid rates');const updated=data.time_last_update_unix*1000;if(updated>now+3600000||now-updated>172800000)throw Error('Stale rates');for(const c of ['EUR','NZD','AUD','VND'])if(!Number.isFinite(data.rates[c])||data.rates[c]<=0)throw Error('Invalid rate');cached={rates:data.rates,date:new Date(updated).toISOString(),fetched:now};return cached;})().finally(()=>{inflight=null});
   try{await inflight}catch(e){if(!cached||now-new Date(cached.date).getTime()>172800000)throw e}
  }
  rate=cached.rates[currency];date=cached.date;
 }
 const all=[...catalogue.offers,...(catalogue.scenarios||[])];
 return {currency,date,version:catalogue.version,prices:Object.fromEntries(all.map(o=>[o.id,{min:Math.round(o.min*rate),max:Math.round(o.max*rate),plus:!!o.plus}]))};
}
