const midtransClient = require('midtrans-client');

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

async function createPayment(job) {
  const transaction = {
    transaction_details: {
      order_id: job.code,
      gross_amount: job.price
    }
  };

  const token = await snap.createTransactionToken(transaction);

  return {
    provider: "MIDTRANS",
    token
  };
}

module.exports = {
  createPayment
};
