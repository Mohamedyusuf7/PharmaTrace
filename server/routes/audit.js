import express from 'express';
import { db } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { calculateAuditHash } from '../utils/cryptoHash.js';

const router = express.Router();

// Get Immutable Audit Trail with multi-parameter filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { action, resourceType, userId, search, startDate, endDate, limit = 100 } = req.query;
    let logs = await db.auditLogs.find({});

    if (action) {
      logs = logs.filter(l => l.action.toLowerCase().includes(action.toLowerCase()));
    }
    if (resourceType) {
      logs = logs.filter(l => l.resourceType === resourceType);
    }
    if (userId) {
      logs = logs.filter(l => l.userId === userId);
    }
    if (startDate) {
      logs = logs.filter(l => l.timestamp >= startDate);
    }
    if (endDate) {
      logs = logs.filter(l => l.timestamp <= endDate);
    }
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.username && l.username.toLowerCase().includes(q)) ||
        (l.resourceId && l.resourceId.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.digitalSignature && l.digitalSignature.toLowerCase().includes(q))
      );
    }

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      count: logs.length,
      logs: logs.slice(0, parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve audit records.' });
  }
});

// Cryptographic Ledger Integrity Verification Engine
// Recomputes hashes from Genesis block to latest block to mathematically prove zero tampering
router.get('/verify-integrity', authenticateToken, async (req, res) => {
  try {
    const logs = await db.auditLogs.find({});

    // Sort chronologically ascending to follow the block chain
    logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let isLedgerIntact = true;
    let tamperedRecords = [];
    let expectedPrevHash = 'GENESIS_BLOCK_HASH_AEGIS_PHARMA_2026';

    for (let i = 0; i < logs.length; i++) {
      const entry = logs[i];

      // Verify link to previous hash
      if (entry.prevHash !== expectedPrevHash) {
        isLedgerIntact = false;
        tamperedRecords.push({
          eventId: entry.eventId,
          timestamp: entry.timestamp,
          reason: `Broken chain link. Expected prevHash: ${expectedPrevHash}, found: ${entry.prevHash}`
        });
      }

      // Recompute SHA-256 for this block
      const recalculatedHash = calculateAuditHash(entry, entry.prevHash);
      if (recalculatedHash !== entry.hash) {
        isLedgerIntact = false;
        tamperedRecords.push({
          eventId: entry.eventId,
          timestamp: entry.timestamp,
          reason: `Invalid record content signature. Hash mismatch.`
        });
      }

      expectedPrevHash = entry.hash;
    }

    res.json({
      success: true,
      totalRecordsVerified: logs.length,
      isLedgerIntact,
      tamperedCount: tamperedRecords.length,
      tamperedRecords,
      complianceStandard: "FDA 21 CFR Part 11 § 11.10(e) / EU Annex 11",
      verificationTimestamp: new Date().toISOString(),
      integritySeal: isLedgerIntact ? `VALIDATED-TAMPER-PROOF-SHA256-${Date.now().toString(36).toUpperCase()}` : "INTEGRITY_COMPROMISED"
    });
  } catch (err) {
    console.error('Integrity verification error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete cryptographic verification.' });
  }
});

// Export audit logs as CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const logs = await db.auditLogs.find({});
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const headers = ['Timestamp', 'Event ID', 'User Name', 'Role', 'IP Address', 'Action', 'Resource', 'Resource ID', 'Details', 'Digital Signature', 'SHA-256 Hash'];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.eventId || l.id}"`,
      `"${l.username || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.ipAddress || ''}"`,
      `"${l.action || ''}"`,
      `"${l.resourceType || ''}"`,
      `"${l.resourceId || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.digitalSignature || ''}"`,
      `"${l.hash || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=AegisPharma_AuditTrail_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to export CSV.' });
  }
});

export default router;
