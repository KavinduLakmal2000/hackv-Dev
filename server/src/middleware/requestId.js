import crypto from 'crypto';

export const requestIdMiddleware = (req, res, next) => {
  const requestId = req.get('x-request-id') || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  req.logContext = { requestId };

  const originalEnd = res.end;
  res.end = function (...args) {
    res.end = originalEnd;
    return res.end(...args);
  };

  console.log(`[${requestId}] ${req.method} ${req.originalUrl}`);
  next();
};
