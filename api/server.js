require("dotenv").config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { generateUniqueNumericCode } = require("./utils/codeGenerator");

// Server setup
const app = express();
app.use(cors({
  origin: [/anyprint\.id$/]
}));
app.use(express.json());
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
const snap = require('./payments');

// page counter
const { PdfCounter } = require("page-count");

// Constant 
const PRICE_PER_PAGE = 500;

// POST /jobs - create a new job
app.post('/jobs', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send('No file uploaded.');

  const copies = parseInt(req.body.copies || '1');
  let pages;
  try {
    pages = await PdfCounter.count(file.buffer);
  } catch (e) {
    console.error(e);
    return res.status(400).send('Invalid PDF file.');
  }

  const price = copies * pages * PRICE_PER_PAGE;
  const code = await generateUniqueNumericCode(pool, 8);

  const objectName = `${code}-${file.originalname}`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: objectName,
      Body: file.buffer,
      ContentType: file.mimetype
    }));

    const fileUrl = `${process.env.FILE_BASE_URL}/print-jobs/${encodeURIComponent(objectName)}`;

    await pool.query(
      `INSERT INTO jobs (code, filename, file_url, copies, pages, price)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [code, file.originalname, fileUrl, copies, pages, price]
    );

    logger.info({
      code,
      copies,
      pages,
      price,
      filename: file.originalname
    }, 'JOB_CREATED');

    res.json({ code, copies, pages, pricePerPage: PRICE_PER_PAGE, price, fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send('Upload failed.');
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

  if (job.status !== 'PAID') {
    return res.status(402).json({ error: 'Job not paid yet' });
  }

  res.json({
    code: job.code,
    filename: job.filename,
    fileUrl: job.file_url,
    copies: job.copies,
    pages: job.pages
  });
});


// POST /payments/callback - create a webhook for midtrans
app.post('/payments/callback', async (req, res) => {
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

// POST /payments/:code - create a new payment to midtrans
app.post('/payments/:code', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM jobs WHERE code=$1', [req.params.code]);
  if (!rows.length) return res.sendStatus(404);

  const job = rows[0];

  const transaction = {
    transaction_details: {
      order_id: job.code,
      gross_amount: job.price
    }
  };

  const token = await snap.createTransactionToken(transaction);

  logger.info({
    code: job.code,
    price: job.price
  }, 'PAYMENT_TOKEN_CREATED');

  res.json({ token });
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
