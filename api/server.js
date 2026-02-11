require("dotenv").config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { generateUniqueNumericCode } = require("./utils/codeGenerator");
const {
  generateDigest,
  generateSignature
} = require("./utils/dokuSignature");

// Server setup
const app = express();
app.use(cors({
  origin: [/anyprint\.id$/]
  // origin: process.env.FRONTEND_URL
}));

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
  })
);

app.use(express.urlencoded({ extended: false }));

// Logger setup
const logger = require('./logger');
const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);

// DB setup
const pool = require('./db');

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// S3 setup
const s3 = require('./storage');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

// midtrans setup
const payments = require('./payments');

// page counter
const path = require("path");
const fs = require("fs/promises");
const os = require("os");
const { convertToPdf } = require("./utils/convertToPdf");
const { convertImageToPdf } = require("./utils/convertImageToPdf");
const { PdfCounter } = require("page-count");

// Constant 
const PRICE_PER_PAGE = 500;

// Supported MIME types
const allowedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png"
];

app.post('/jobs', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded" });

  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: "Unsupported file type" });
  }

  const copies = parseInt(req.body.copies || "1");

  let pdfBuffer = file.buffer;
  let filename = file.originalname;

  try {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "anyprint-"));
    let inputPath = path.join(tmpDir, file.originalname);

    await fs.writeFile(inputPath, file.buffer);

    // DOCX / PPTX → PDF
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      const pdfPath = await convertToPdf(inputPath, tmpDir);
      pdfBuffer = await fs.readFile(pdfPath);
      filename = file.originalname.replace(/\.(docx|pptx)$/i, ".pdf");
    }

    // JPG / PNG → PDF
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png"
    ) {
      const pdfPath = await convertImageToPdf(inputPath, tmpDir);
      pdfBuffer = await fs.readFile(pdfPath);
      filename = file.originalname.replace(/\.(jpg|jpeg|png)$/i, ".pdf");
    }

    // Count pages from final PDF
    const pages = await PdfCounter.count(pdfBuffer);
    const price = copies * pages * PRICE_PER_PAGE;
    const code = await generateUniqueNumericCode(pool, 8);

    const objectName = `${code}-${filename}`;

    // Upload PDF to S3
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: objectName,
      Body: pdfBuffer,
      ContentType: "application/pdf"
    }));

    const fileUrl = `${process.env.FILE_BASE_URL}/print-jobs/${encodeURIComponent(objectName)}`;

    // Save job
    await pool.query(
      `INSERT INTO jobs (code, filename, file_url, copies, pages, price)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [code, filename, fileUrl, copies, pages, price]
    );

    // cleanup temp files
    await fs.rm(tmpDir, { recursive: true, force: true });

    res.json({
      code,
      copies,
      pages,
      pricePerPage: PRICE_PER_PAGE,
      price,
      fileUrl
    });

  } catch (err) {
    console.error("JOB_UPLOAD_ERROR:", err);
    res.status(500).json({ error: "File processing failed" });
  }
});


// GET /jobs/:code - get job for printing
app.get('/jobs/:code', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE code=$1',
    [req.params.code]
  );

  if (!rows.length) return res.sendStatus(404);

  const job = rows[0];

  if (job.status === 'USED') {
      return res.status(409).json({ error: 'Job already printed' });
  }

  if (job.status !== 'PAID') {
    return res.status(402).json({ error: 'Job not paid yet' });
  }

  await pool.query(
    `UPDATE jobs 
    SET status='USED', printed_at=NOW()
    WHERE code=$1 AND status='PAID'`,
    [job.code]
  );

  res.json({
    code: job.code,
    filename: job.filename,
    fileUrl: job.file_url,
    copies: job.copies,
    pages: job.pages
  });
});

// POST /payments/callback/midtrans - create a webhook for midtrans
app.post('/payments/callback/midtrans', async (req, res) => {
  const notification = req.body;
  const code = notification.order_id;

  logger.info({
    code,
    status: notification.transaction_status,
    midtransId: notification.transaction_id
  }, 'PAYMENT_CALLBACK_RECEIVED');

  const crypto = require('crypto');
  const signature = crypto.createHash('sha512')
    .update(notification.order_id + notification.status_code + notification.gross_amount + process.env.MIDTRANS_SERVER_KEY)
    .digest('hex');
  if (signature !== notification.signature_key) return res.sendStatus(403);

  if (notification.transaction_status === 'settlement') {
    await pool.query(
      `UPDATE jobs SET status='PAID', paid_at=NOW(), payment_ref=$1 WHERE code=$2`,
      [notification.transaction_id, code]
    );

    logger.info({
      code,
      midtransId: notification.transaction_id
    }, 'JOB_PAID');
  }

  res.sendStatus(200);
});

// POST /payments/callback/doku - QRIS
app.post('/payments/callback/doku', async (req, res) => {
  const body = req.body;
  const bodyString = req.rawBody;

  // ---- headers from DOKU ----
  const clientId = req.header("Client-Id");
  const requestId = req.header("Request-Id");
  const requestTimestamp = req.header("Request-Timestamp");
  const signatureHeader = req.header("Signature");

  const requestTarget = "/api/payments/callback/doku";

  if (!clientId || !requestId || !requestTimestamp || !signatureHeader) {
    return res.sendStatus(400);
  }

  // ---- signature verification (shared util) ----
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
    logger.warn(
      { requestId },
      "DOKU_CALLBACK_INVALID_SIGNATURE"
    );
    return res.sendStatus(403);
  }

  // ---- QRIS-specific handling ----
  if (body?.service?.id !== "QRIS") {
    return res.sendStatus(200);
  }

  const code = body?.order?.invoice_number;
  const status = body?.transaction?.status;

  if (status === "SUCCESS") {
    const { rows } = await pool.query(
      "SELECT price, status FROM jobs WHERE code=$1",
      [code]
    );

    if (!rows.length) return res.sendStatus(404);

    // Extra safety: amount check
    if (Number(rows[0].price) !== Number(body.order.amount)) {
      return res.sendStatus(400);
    }

    await pool.query(
      `UPDATE jobs
       SET status='PAID',
           paid_at=NOW(),
           payment_ref=$1
       WHERE code=$2 AND status!='PAID'`,
      [body.emoney_payment?.approval_code, code]
    );

    logger.info(
      { code, provider: "DOKU" },
      "JOB_PAID"
    );
  }

  res.sendStatus(200);
});

// POST /payments/demo-settle/:code
app.post('/payments/demo-settle/:code', async (req, res) => {
  if (process.env.IS_DEMO !== "true") {
    return res.status(403).json({ error: "Demo mode is disabled" });
  }

  const code = req.params.code;

  const { rows } = await pool.query(
    "SELECT * FROM jobs WHERE code=$1",
    [code]
  );

  if (!rows.length) return res.sendStatus(404);

  const job = rows[0];

  if (job.status === "PAID") {
    return res.json({ message: "Already paid" });
  }

  if (job.status === "USED") {
    return res.json({ message: "Already used" });
  }

  await pool.query(
    `UPDATE jobs 
     SET status='PAID', 
         paid_at=NOW(), 
         payment_ref='DEMO_PAYMENT'
     WHERE code=$1`,
    [code]
  );

  logger.info({
    code,
    mode: "DEMO"
  }, "JOB_DEMO_PAID");

  res.json({ success: true });
});

// POST /payments/:code - create a new payment
app.post('/payments/:code', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE code=$1',
    [req.params.code]
  );
  if (!rows.length) return res.sendStatus(404);

  const job = rows[0];

  const payment = await payments.createPayment(job);

  logger.info({
    code: job.code,
    price: job.price,
    provider: payment.provider
  }, 'PAYMENT_CREATED');

  res.json(payment);
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
