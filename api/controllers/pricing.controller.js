const pricingService = require('../services/pricing.service');

exports.getPrices = async (req, res) => {
  try {
    const result = await pricingService.getPrices();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch prices" });
  }
};

exports.updatePrices = async (req, res) => {
  try {
    const result = await pricingService.updatePrices(req.body);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }

    console.error(err);
    res.status(500).json({ error: "Failed to update prices" });
  }
};
