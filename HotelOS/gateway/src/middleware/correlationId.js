const { v4: uuidv4 } = require('uuid');

function correlationId(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
}

module.exports = { correlationId };
