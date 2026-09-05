const paymentService = require('../services/payment.service');

exports.dokuCallback = async (req, res) => {
  try {
    await paymentService.handleDokuCallback(req);
    res.sendStatus(200);
  } catch (err) {
    if (err.status) return res.sendStatus(err.status);
    res.sendStatus(500);
  }
};

exports.demoSettle = async (req, res) => {
  try {
    const result = await paymentService.demoSettle(req.params.code);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const result = await paymentService.createPayment(req.params.code);
    res.json(result);
  } catch (err) {
    if (err.status) return res.sendStatus(err.status);
    res.sendStatus(500);
  }
};
