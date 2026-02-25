const reportService = require('../services/report.service');

exports.getSalesSummary = async (req, res) => {
  try {
    const result = await reportService.getSalesSummary(req.query);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sales summary" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const result = await reportService.getOrders(req.query);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

exports.exportOrders = async (req, res) => {
  try {
    const { csv, filename } = await reportService.exportOrders(req.query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export orders" });
  }
};
