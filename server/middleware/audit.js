// ─── AUDIT MIDDLEWARE ───
// Logs every API request as a system event for full traceability

import eventStore from '../eventStore.js';

export function auditMiddleware(req, res, next) {
  // Only log mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalSend = res.send;
    res.send = function (body) {
      // Log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        eventStore.append({
          eventType: 'API_REQUEST',
          userId: req.headers['x-user-id'] || 'admin-default',
          entityType: 'api',
          entityId: req.path,
          payload: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString(),
          },
        }).catch(err => console.error('[Audit] Failed to log:', err.message));
      }
      return originalSend.call(this, body);
    };
  }
  next();
}

export default auditMiddleware;
