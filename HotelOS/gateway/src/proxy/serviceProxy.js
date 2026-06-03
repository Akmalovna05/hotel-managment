const { createProxyMiddleware } = require('http-proxy-middleware');

function createServiceProxy(target, pathPrefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === pathPrefix) {
        return '/';
      }
      if (path.startsWith(pathPrefix + '/') || path.startsWith(pathPrefix + '?')) {
        return path.slice(pathPrefix.length);
      }
      return path;
    },
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader('X-Correlation-Id', req.correlationId);
        if (req.headers.authorization) {
          proxyReq.setHeader('Authorization', req.headers.authorization);
        }
      },
      error: (err, req, res) => {
        console.error('[gateway] Proxy error', req.correlationId, err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Downstream service unavailable' });
        }
      },
    },
  });
}

module.exports = { createServiceProxy };
