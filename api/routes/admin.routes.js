const express = require('express');
const adminController = require('../controllers/admin.controller');
const adminAuth = require('../middleware/adminAuth.middleware');

const router = express.Router();

router.use(adminAuth);

router.get('/reports/sales', adminController.getSalesSummary);
router.get('/orders', adminController.getOrders);
router.get('/orders/export', adminController.exportOrders);

module.exports = router;
