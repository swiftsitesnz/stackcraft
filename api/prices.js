function createHandler(load = () => import('../premium/prices.mjs')) {
  return async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET'); res.setHeader('Cache-Control', 'no-store');
      return res.status(405).json({error:'Method not allowed'});
    }
    const currency = req.query?.currency || 'USD';
    if (typeof currency !== 'string' || !['USD','EUR','NZD','AUD','VND'].includes(currency)) {
      res.setHeader('Cache-Control','no-store'); return res.status(400).json({error:'Unsupported currency'});
    }
    try {
      const {convertedCatalogue} = await load();
      const catalogue = await convertedCatalogue(currency);
      res.setHeader('Cache-Control','public, max-age=300, s-maxage=3600');
      return res.status(200).json(catalogue);
    } catch {
      res.setHeader('Cache-Control','no-store');
      return res.status(503).json({error:'Currency conversion unavailable',currency:'USD'});
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
