const { v4: uuid } = require('uuid');
const logger = require('../logger');

module.exports = (req, res, next) => {
  const id = uuid();
  req.requestId = id;

  logger.info({
    requestId: id,
    method: req.method,
    path: req.path
  }, 'Incoming request');

  res.on('finish', () => {
    logger.info({
      requestId: id,
      status: res.statusCode
    }, 'Request finished');
  });

  next();
};
