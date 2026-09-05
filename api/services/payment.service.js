const pool = require('../config/db');
const logger = require('../config/logger');
const payments = require('../payments/doku');

const {
  generateDigest,
  generateSignature
} = require('../utils/dokuSignature');

exports.handleDokuCallback = async (req) => {
  const body = req.body;
  const bodyString = req.rawBody;

  const clientId = req.header("Client-Id");
  const requestId = req.header("Request-Id");
  const requestTimestamp = req.header("Request-Timestamp");
  const signatureHeader = req.header("Signature");

  const requestTarget = "/api/payments/callback/doku";

  if (!clientId || !requestId || !requestTimestamp || !signatureHeader) {
    throw { status: 400 };
  }

  const digest = generateDigest(bodyString);

  const expectedSignature = generateSignature({
    clientId,
    requestId,
    requestTimestamp,
    requestTarget,
    digest,
    secretKey: process.env.DOKU_SECRET_KEY
  });

  if (expectedSignature !== signatureHeader) {
    logger.warn({ requestId }, "DOKU_CALLBACK_INVALID_SIGNATURE");
    throw { status: 403 };
  }

  if (body?.service?.id !== "QRIS") {
    return;
  }

  const code = body?.order?.invoice_number;
  const status = body?.transaction?.status;

  logger.info({
    code: code,
    status: status,
  }, 'DOKU_PAYMENT_CALLBACK_RECEIVED');

  if (status === "SUCCESS") {
    const { rows } = await pool.query(
      "SELECT price, status FROM jobs WHERE code=$1",
      [code]
    );

    if (!rows.length) {
      throw { status: 404 };
    }

    if (Number(rows[0].price) !== Number(body.order.amount)) {
      throw { status: 400 };
    }

    await pool.query(
      `UPDATE jobs
       SET status='PAID',
           paid_at=NOW(),
           payment_ref=$1
       WHERE code=$2 AND status!='PAID'`,
      [body.emoney_payment?.approval_code, code]
    );

    logger.info({ code, provider: "DOKU" }, "JOB_PAID");
  }
};

exports.demoSettle = async (code) => {
  if (process.env.IS_DEMO !== "true") {
    throw { status: 403, message: "Demo mode is disabled" };
  }

  const { rows } = await pool.query(
    "SELECT * FROM jobs WHERE code=$1",
    [code]
  );

  if (!rows.length) {
    throw { status: 404, message: "Not found" };
  }

  const job = rows[0];

  if (job.status === "PAID") {
    return { message: "Already paid" };
  }

  if (job.status === "USED") {
    return { message: "Already used" };
  }

  await pool.query(
    `UPDATE jobs 
     SET status='PAID', 
         paid_at=NOW(), 
         payment_ref='DEMO_PAYMENT'
     WHERE code=$1`,
    [code]
  );

  logger.info({ code, mode: "DEMO" }, "JOB_DEMO_PAID");

  return { success: true };
};

exports.createPayment = async (code) => {
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE code=$1',
    [code]
  );

  if (!rows.length) {
    throw { status: 404 };
  }

  const job = rows[0];

  const payment = await payments.createPayment(job);

  logger.info({
    code: job.code,
    price: job.price,
    provider: payment.provider
  }, 'PAYMENT_CREATED');

  return payment;
};
