import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { generateDigitalSignatureStamp } from '../utils/cryptoHash.js';

/**
 * 21 CFR Part 11 Digital Signature Validator
 * Validates the user's re-entered password or 4-digit PIN for high-impact regulatory actions.
 */
export async function verifyDigitalSignature(req, res, next) {
  const { signaturePin, signaturePassword, signatureReason, targetType, targetId } = req.body;
  const user = req.user;

  if (!signaturePin && !signaturePassword) {
    return res.status(400).json({
      success: false,
      message: 'FDA 21 CFR Part 11 Digital Signature Required: Please re-enter your Security PIN or Password.'
    });
  }

  if (!signatureReason || signatureReason.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'A valid reason for this regulatory signature is mandatory (minimum 5 characters).'
    });
  }

  let isValid = false;

  // Check PIN if provided
  if (signaturePin && user.pinHash) {
    isValid = await bcrypt.compare(signaturePin.toString(), user.pinHash);
  }

  // Check Password if PIN didn't match or was not provided
  if (!isValid && signaturePassword && user.passwordHash) {
    isValid = await bcrypt.compare(signaturePassword, user.passwordHash);
  }

  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: 'Digital Signature Verification Failed: Invalid Security PIN / Password.'
    });
  }

  // Generate official 21 CFR Part 11 Signature Stamp
  const signatureData = generateDigitalSignatureStamp({
    userId: user.id,
    username: user.fullName || user.username,
    userRole: user.role,
    reason: signatureReason,
    targetType: targetType || 'RECORD_ACTION',
    targetId: targetId || req.params.id || 'N/A',
    timestamp: new Date().toISOString()
  });

  // Store in signature repository
  await db.digitalSignatures.create({
    ...signatureData,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'AegisPharma Client'
  });

  // Attach signature metadata to req for downstream controller usage
  req.digitalSignature = signatureData;
  next();
}
