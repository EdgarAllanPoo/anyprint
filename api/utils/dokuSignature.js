const crypto = require("crypto");

function generateDigest(jsonBody) {
  return crypto
    .createHash("sha256")
    .update(jsonBody, "utf-8")
    .digest("base64");
}

function generateSignature({
  clientId,
  requestId,
  requestTimestamp,
  requestTarget,
  digest,
  secretKey
}) {
  let componentSignature =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${requestTimestamp}\n` +
    `Request-Target:${requestTarget}`;

  if (digest) {
    componentSignature += `\nDigest:${digest}`;
  }

  return (
    "HMACSHA256=" +
    crypto
      .createHmac("sha256", secretKey)
      .update(componentSignature)
      .digest("base64")
  );
}

function getCurrentTimestamp() {
  // ISO 8601 UTC, no milliseconds
  return new Date().toISOString().slice(0, 19) + "Z";
}

module.exports = {
  generateDigest,
  generateSignature,
  getCurrentTimestamp
};
