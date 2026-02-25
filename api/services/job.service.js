const path = require("path");
const fs = require("fs/promises");
const os = require("os");
const { PdfCounter } = require("page-count");
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const pool = require('../config/db');
const s3 = require('../config/storage');
const { generateUniqueNumericCode } = require("../utils/codeGenerator");
const { convertToPdf } = require("../utils/convertToPdf");
const { convertImageToPdf } = require("../utils/convertImageToPdf");

const PRICE = {
  BW: 750,
  COLOR: 1500
};

const allowedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png"
];

exports.createJob = async (req) => {
  const file = req.file;
  if (!file) {
    throw { status: 400, message: "No file uploaded" };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    throw { status: 400, message: "Unsupported file type" };
  }

  const copies = parseInt(req.body.copies || "1");
  const printMode = (req.body.printMode || "BW").toUpperCase();

  if (!PRICE[printMode]) {
    throw { status: 400, message: "Invalid print mode" };
  }

  let pdfBuffer = file.buffer;
  let filename = file.originalname;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "anyprint-"));
  const inputPath = path.join(tmpDir, file.originalname);

  try {
    await fs.writeFile(inputPath, file.buffer);

    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      const pdfPath = await convertToPdf(inputPath, tmpDir);
      pdfBuffer = await fs.readFile(pdfPath);
      filename = file.originalname.replace(/\.(docx|pptx)$/i, ".pdf");
    }

    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png"
    ) {
      const pdfPath = await convertImageToPdf(inputPath, tmpDir);
      pdfBuffer = await fs.readFile(pdfPath);
      filename = file.originalname.replace(/\.(jpg|jpeg|png)$/i, ".pdf");
    }

    const pages = await PdfCounter.count(pdfBuffer);

    const pricePerPage = PRICE[printMode];
    const price = copies * pages * pricePerPage;

    const code = await generateUniqueNumericCode(pool, 8);
    const objectName = `${code}-${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: objectName,
      Body: pdfBuffer,
      ContentType: "application/pdf"
    }));

    const fileUrl = `${process.env.FILE_BASE_URL}/print-jobs/${encodeURIComponent(objectName)}`;

    await pool.query(
      `INSERT INTO jobs (code, filename, file_url, copies, pages, price, print_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [code, filename, fileUrl, copies, pages, price, printMode]
    );

    return {
      code,
      copies,
      pages,
      printMode,
      pricePerPage,
      price,
      fileUrl
    };

  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};

exports.getJob = async (code) => {
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE code=$1',
    [code]
  );

  if (!rows.length) {
    throw { status: 404, message: "Not found" };
  }

  const job = rows[0];

  if (job.status === 'USED') {
    throw { status: 409, message: "Job already printed" };
  }

  if (job.status !== 'PAID') {
    throw { status: 402, message: "Job not paid yet" };
  }

  await pool.query(
    `UPDATE jobs 
     SET status='USED', printed_at=NOW()
     WHERE code=$1 AND status='PAID'`,
    [job.code]
  );

  return {
    code: job.code,
    filename: job.filename,
    fileUrl: job.file_url,
    copies: job.copies,
    pages: job.pages,
    printMode: job.print_mode
  };
};
