const axios = require("axios");
// const { v4: uuidv4 } = require("uuid");
const {
  generateDigest,
  generateSignature,
  getCurrentTimestamp
} = require("../utils/dokuSignature");

const BASE_URL = process.env.DOKU_BASE_URL;
const CLIENT_ID = process.env.DOKU_CLIENT_ID;
const SECRET_KEY = process.env.DOKU_SECRET_KEY;

async function createPayment(job) {
  // const requestId = uuidv4();
  const requestId = job.code;
  const requestTimestamp = getCurrentTimestamp();
  const requestTarget = "/checkout/v1/payment";

  const body = {
    order: {
      amount: job.price,
      invoice_number: requestId,
      currency: "IDR",
      callback_url: process.env.FRONTEND_URL,
      callback_url_cancel: process.env.FRONTEND_URL,
      callback_url_result: `${process.env.FRONTEND_URL}/done/${job.code}`
    },
    payment: {
      payment_due_date: 30,
      payment_method_types: ["QRIS"]
    },
    customer: {
      id: requestId,
      name: "AnyPrint User",
      email: "anyprintvendingservices@gmail.com",
      phone: "6281928880788"
    }
  };

  const bodyString = JSON.stringify(body);
  const digest = generateDigest(bodyString);

  const signature = generateSignature({
    clientId: CLIENT_ID,
    requestId,
    requestTimestamp,
    requestTarget,
    digest,
    secretKey: SECRET_KEY
  });

  const res = await axios.post(
    `${BASE_URL}${requestTarget}`,
    body,
    {
      headers: {
        "Client-Id": CLIENT_ID,
        "Request-Id": requestId,
        "Request-Timestamp": requestTimestamp,
        "Signature": signature,
        "Content-Type": "application/json"
      }
    }
  );

  return {
    provider: "DOKU",
    payment_url: res.data?.response?.payment?.url,
    raw: res.data
  };
}

module.exports = { createPayment };
