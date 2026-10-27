import { db } from '../config/db.js';
import { calculateAuditHash } from '../utils/cryptoHash.js';

/**
 * Creates and appends an immutable, cryptographic SHA-256 chained audit record.
 */
export async function recordAuditLog({
  userId = 'SYSTEM',
  username = 'System Automated',
  userRole = 'SYSTEM',
  ipAddress = '127.0.0.1',
  action,
  resourceType,
  resourceId,
  details,
  fieldChanged = '',
  oldValue = '',
  newValue = '',
  digitalSignature = ''
}) {
  try {
    const allLogs = await db.auditLogs.find({});
    const lastLog = allLogs.length > 0 ? allLogs[allLogs.length - 1] : null;
    const prevHash = lastLog ? lastLog.hash : 'GENESIS_BLOCK_HASH_AEGIS_PHARMA_2026';

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      userId,
      username,
      userRole,
      ipAddress,
      action,
      resourceType,
      resourceId: String(resourceId),
      details,
      fieldChanged,
      oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue),
      newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue),
      digitalSignature: digitalSignature || ''
    };

    const hash = calculateAuditHash(logEntry, prevHash);
    const savedLog = await db.auditLogs.create({
      eventId: `EV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...logEntry,
      prevHash,
      hash
    });

    return savedLog;
  } catch (err) {
    console.error('❌ Failed to append audit log entry:', err);
  }
}

/**
 * Express Middleware to intercept sensitive operations and generate automatic audit logs.
 */
export function auditInterceptor(req, res, next) {
  // Only intercept mutating methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Execute original response first
      const result = originalJson(body);

      // If action was successful, log it asynchronously
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = req.user || { id: 'ANONYMOUS', fullName: 'Anonymous Client', role: 'PUBLIC' };
        const actionType = `${req.method}_${req.baseUrl.replace('/api/', '').toUpperCase()}`;
        const resourceId = req.params.id || req.body.id || req.body.batchNumber || req.body.lotNumber || 'N/A';
        const signatureStamp = req.digitalSignature ? req.digitalSignature.cryptographicStamp : (req.body.digitalSignature || '');

        recordAuditLog({
          userId: user.id,
          username: user.fullName || user.username,
          userRole: user.role,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
          action: actionType,
          resourceType: req.baseUrl.replace('/api/', '').toUpperCase(),
          resourceId: String(resourceId),
          details: `${user.fullName || user.username} performed ${req.method} on ${req.originalUrl}`,
          fieldChanged: req.body.fieldChanged || 'RECORD_MUTATION',
          oldValue: req.body.oldValue || '',
          newValue: req.body.newValue || JSON.stringify(req.body).slice(0, 300),
          digitalSignature: signatureStamp
        }).catch(err => console.error('Audit interceptor error:', err));
      }

      return result;
    };
  }

  next();
}
