const dictionaries = require('../premium/dictionaries.json');
const catalogue = require('../premium/catalogue.json');
const MAX_BYTES = 32768;
const WINDOW_MS = 10 * 60 * 1000;
const services = new Set(catalogue.offers.filter(x => x.brand === 'stack').map(x => x.id).concat('unsure'));
// Budget bands come from the shared catalogue so a USD 500 enquiry is never forced into a larger band.
const money = n => 'USD ' + Number(n).toLocaleString('en-US');
const budgetLabels = new Map(catalogue.budgets.stack.map(b => [b.id, b.upTo ? 'Up to ' + money(b.max) : b.plus ? money(b.min) + '+' : money(b.min) + '–' + b.max.toLocaleString('en-US')])
  .concat([['monthly','Monthly support'],['hourly','Hourly consultancy'],['unsure','Not sure yet']]));
const currencies = new Set(['USD', 'EUR', 'NZD', 'AUD', 'VND']);
const escapeHtml = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Best-effort per-instance burst protection, not a distributed rate limit.
function createHandler({sendEmail, env = process.env, now = Date.now} = {}) {
  const attempts = new Map();
  const send = sendEmail || (async message => {
    if (!env.RESEND_API_KEY) throw new Error('Mail not configured');
    const {Resend} = require('resend');
    return new Resend(env.RESEND_API_KEY).emails.send(message);
  });
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    let d = dictionaries.en;
    const fail = (status, key = 'failed') => res.status(status).json({success: false, message: d[key]});
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return fail(405); }
    const allowed = new Set(['https://stackcraft.co.nz', 'https://www.stackcraft.co.nz']);
    for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
      if (host && /^[a-z0-9.-]+$/i.test(host)) allowed.add('https://' + host);
    }
    if (env.NODE_ENV !== 'production') {
      allowed.add('http://localhost:3000'); allowed.add('http://127.0.0.1:3000');
    }
    const origin = req.headers?.origin;
    if ((origin && !allowed.has(origin)) || req.headers?.['sec-fetch-site'] === 'cross-site') return fail(403);
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type'] || '')) return fail(415);
    const declared = req.headers?.['content-length'];
    if (declared && (!/^\d+$/.test(String(declared)) || Number(declared) > MAX_BYTES)) return fail(413);
    let raw;
    try {
      const body = req.body;
      const text = typeof body === 'string' || Buffer.isBuffer(body) ? body.toString() : JSON.stringify(body);
      if (!text || Buffer.byteLength(text, 'utf8') > MAX_BYTES) return fail(413);
      raw = JSON.parse(text);
    } catch { return fail(400, 'invalid'); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(400, 'invalid');
    if (typeof raw.locale === 'string' && Object.hasOwn(dictionaries, raw.locale)) d = dictionaries[raw.locale];
    if (raw.locale !== undefined && (typeof raw.locale !== 'string' || !Object.hasOwn(dictionaries, raw.locale))) return fail(400, 'invalid');
    const limits = {name:160,email:254,service:80,helpType:80,business:160,company:160,budget:80,timing:160,country:160,team:160,dates:160,duration:160,systems:1000,confidentiality:1000,message:6500,website:500,locale:10,currency:3};
    const fields = {};
    for (const [key, limit] of Object.entries(limits)) {
      if (raw[key] !== undefined && typeof raw[key] !== 'string') return fail(400, 'invalid');
      fields[key] = (raw[key] || '').trim();
      if (fields[key].length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(fields[key])) return fail(400, 'invalid');
      if (!['message','systems','confidentiality'].includes(key) && /[\r\n]/.test(fields[key])) return fail(400, 'invalid');
    }
    const service = fields.service || fields.helpType;
    if (!fields.name || !fields.email || !service || fields.message.length < 10 || fields.website) return fail(400, 'invalid');
    if (!/^[^\s@<>"(),;:\\]+@[^\s@<>"(),;:\\]+\.[^\s@<>"(),;:\\]+$/.test(fields.email)) return fail(400, 'emailInvalid');
    if (!services.has(service) || (fields.budget && !budgetLabels.has(fields.budget)) || (fields.currency && !currencies.has(fields.currency))) return fail(400, 'invalid');
    if (raw.onsite !== undefined && typeof raw.onsite !== 'boolean') return fail(400, 'invalid');
    if (raw.onsite && !fields.country) return fail(400, 'invalid');
    const time = now();
    for (const [key, entry] of attempts) if (time >= entry.expires) attempts.delete(key);
    const address = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 100);
    let rate = attempts.get(address);
    if (!rate) {
      if (attempts.size >= 10000) return fail(429);
      rate = {count:0, expires:time + WINDOW_MS}; attempts.set(address, rate);
    }
    if (rate.count >= 5) { res.setHeader('Retry-After', String(Math.ceil((rate.expires-time)/1000))); return fail(429); }
    rate.count += 1;
    const rows = [
      ['Name',fields.name],['Email',fields.email],['Organisation',fields.business || fields.company],
      ['Service',service],['Budget selection',fields.budget ? budgetLabels.get(fields.budget) + ' (' + fields.budget + ')' : ''],['Display currency',fields.currency],
      ['Language',fields.locale || 'en'],['Timing',fields.timing],['Location',fields.country],
      ['Team',fields.team],['Dates',fields.dates],['Duration',fields.duration],['Systems and access',fields.systems],
      ['Confidentiality summary',fields.confidentiality],['On-site',raw.onsite?'Yes':''],['Brief',fields.message],
    ].filter(([,value]) => value);
    const from = 'Stackcraft <hello@stackcraft.co.nz>';
    try {
      const notification = await send({
        from,to:'eli@stackcraft.co.nz',replyTo:fields.email,subject:'New Stackcraft enquiry',
        text:rows.map(([key,value]) => `${key}: ${value}`).join('\n\n'),
        html:'<div style="font-family: sans-serif">' + rows.map(([key,value]) => `<p><strong>${key}:</strong><br>${escapeHtml(value).replace(/\n/g,'<br>')}</p>`).join('') + '</div>',
      });
      if (notification?.error || !notification?.data?.id) return fail(502);
    } catch { return fail(502); }
    // Never echo untrusted links/content in courtesy mail. Failure here must not
    // ask the visitor to duplicate an enquiry the owner's provider accepted.
    try {
      await send({from,to:fields.email,subject:`${d.emailSubject} — Stackcraft`,text:`${d.sent}\n\nEli Mitchell\nStackcraft`,html:`<p>${escapeHtml(d.sent)}</p><p>Eli Mitchell<br>Stackcraft</p>`});
    } catch { /* Owner notification already accepted. */ }
    return res.status(200).json({success:true,message:d.sent});
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
