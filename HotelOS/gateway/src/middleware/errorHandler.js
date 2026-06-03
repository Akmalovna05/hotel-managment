function errorHandler(err, req, res, _next) {
  console.error('[gateway]', req.correlationId, err.message);
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(502).json({ error: 'Downstream service unavailable' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
}

module.exports = { errorHandler };
