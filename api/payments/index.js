const provider = process.env.PAYMENT_PROVIDER;

if (provider === "DOKU") {
  module.exports = require("./doku");
} else {
  module.exports = require("./midtrans");
}
