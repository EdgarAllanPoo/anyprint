const express = require('express');
const paymentsController = require('../controllers/payment.controller');

const router = express.Router();

router.post('/callback/doku', paymentsController.dokuCallback);

router.post('/demo-settle/:code', paymentsController.demoSettle);

router.post('/:code', paymentsController.createPayment);

module.exports = router;
