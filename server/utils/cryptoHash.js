import crypto from 'crypto';

const SIGNATURE_SECRET = process.env.SIGNATURE_SECRET || 'aegis-pharma-21cfr11-secure-salt-2026';

/**
 * Calculates SHA-256 hash for audit log chain immutability
 */
export function calculateAuditHash(logEntry, prevHash = 'GENESIS_BLOCK_HASH') {
  const dataString = JSON.stringify({
    timestamp: logEntry.timestamp,
    userId: logEntry.userId,
    userRole: logEntry.userRole,
    action: logEntry.action,
    resourceType: logEntry.resourceType,
    resourceId: logEntry.resourceId,
    fieldChanged: logEntry.fieldChanged || '',
    oldValue: logEntry.oldValue || '',
    newValue: logEntry.newValue || '',
    digitalSignature: logEntry.digitalSignature || '',
    prevHash: prevHash || 'GENESIS_BLOCK_HASH'
  });

  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Generates cryptographic digital signature token (21 CFR Part 11 compliant)
 */
export function generateDigitalSignatureStamp({ userId, username, userRole, reason, targetType, targetId, timestamp }) {
  const payload = `${userId}:${username}:${userRole}:${reason}:${targetType}:${targetId}:${timestamp}:${SIGNATURE_SECRET}`;
  const cryptoToken = crypto.createHmac('sha256', SIGNATURE_SECRET).update(payload).digest('hex').substring(0, 32).toUpperCase();
  
  return {
    signatureId: `SIG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    cryptographicStamp: `21CFR11-SEC-${cryptoToken}`,
    signedAt: timestamp || new Date().toISOString(),
    signedBy: username,
    role: userRole,
    reason: reason,
    legalStatement: "I confirm that I have reviewed this record and my digital signature is the legally binding equivalent of my handwritten signature under FDA 21 CFR Part 11."
  };
}
