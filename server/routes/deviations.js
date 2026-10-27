import express from 'express';
import { db } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { verifyDigitalSignature } from '../middleware/signatureValidator.js';
import { recordAuditLog } from '../middleware/auditLogger.js';

const router = express.Router();

// Get all deviations with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, severity, batchId } = req.query;
    let deviations = await db.deviations.find({});

    if (status) {
      deviations = deviations.filter(d => d.status === status);
    }
    if (severity) {
      deviations = deviations.filter(d => d.severity === severity);
    }
    if (batchId) {
      deviations = deviations.filter(d => d.batchId === batchId);
    }

    deviations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, count: deviations.length, deviations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch deviations.' });
  }
});

// Log New Incident / Deviation (Automatically applies BATCH HOLD LOCK)
router.post('/log', authenticateToken, requireRole(['OPERATOR', 'QA_QC_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { batchId, stageNumber, stageName, title, severity, description, immediateActionTaken, placeHold } = req.body;

    if (!batchId || !title || !severity || !description) {
      return res.status(400).json({
        success: false,
        message: 'Mandatory fields missing (batchId, title, severity, description).'
      });
    }

    const batch = await db.batches.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Referenced batch record not found.' });
    }

    const shouldPlaceHold = placeHold !== undefined ? placeHold : true; // Default to freezing the batch

    const deviationNumber = `DEV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newDeviation = await db.deviations.create({
      id: `DEV-${Date.now().toString(36).toUpperCase()}`,
      deviationNumber,
      title: title.trim(),
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      stageNumber: stageNumber || 1,
      stageName: stageName || 'Manufacturing Line',
      severity, // MINOR | MAJOR | CRITICAL
      description: description.trim(),
      immediateActionTaken: immediateActionTaken || 'Production paused pending initial impact assessment.',
      loggedBy: {
        id: req.user.id,
        name: req.user.fullName,
        role: req.user.role
      },
      status: 'OPEN',
      capa: {
        actionPlan: '',
        rootCause: '',
        assignedTo: '',
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        completedAt: null,
        resolutionNotes: '',
        verifiedBy: null
      },
      holdPlaced: shouldPlaceHold,
      createdAt: new Date().toISOString(),
      resolvedAt: null
    });

    // AUTOMATIC BATCH HOLD LOCK
    if (shouldPlaceHold) {
      await db.batches.findByIdAndUpdate(batch.id, {
        activeDeviationHold: true,
        previousStatus: batch.status,
        status: 'HOLD'
      });
    }

    await recordAuditLog({
      userId: req.user.id,
      username: req.user.fullName,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      action: 'DEVIATION_INCIDENT_LOGGED',
      resourceType: 'DEVIATION',
      resourceId: newDeviation.id,
      details: `${req.user.fullName} logged ${severity} deviation #${deviationNumber} on Batch #${batch.batchNumber}: "${title}". ${shouldPlaceHold ? 'BATCH FROZEN ON QA HOLD.' : ''}`,
      fieldChanged: 'DEVIATION_STATE',
      oldValue: 'NORMAL',
      newValue: `DEVIATION_${severity}_HOLD_${shouldPlaceHold}`
    });

    res.status(201).json({
      success: true,
      deviation: newDeviation,
      holdPlaced: shouldPlaceHold,
      message: `Deviation #${deviationNumber} logged. ${shouldPlaceHold ? `Batch #${batch.batchNumber} is now FROZEN on QA Hold.` : ''}`
    });
  } catch (err) {
    console.error('Deviation log error:', err);
    res.status(500).json({ success: false, message: 'Failed to record deviation.' });
  }
});

// Update / Assign CAPA Action Plan
router.patch('/:id/capa', authenticateToken, requireRole(['QA_QC_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { actionPlan, rootCause, assignedTo, dueDate } = req.body;
    const deviation = await db.deviations.findById(req.params.id);

    if (!deviation) {
      return res.status(404).json({ success: false, message: 'Deviation record not found.' });
    }

    const updatedCapa = {
      ...deviation.capa,
      actionPlan: actionPlan || deviation.capa.actionPlan,
      rootCause: rootCause || deviation.capa.rootCause,
      assignedTo: assignedTo || deviation.capa.assignedTo,
      dueDate: dueDate || deviation.capa.dueDate
    };

    const updatedDeviation = await db.deviations.findByIdAndUpdate(deviation.id, {
      capa: updatedCapa,
      status: 'CAPA_ASSIGNED'
    });

    await recordAuditLog({
      userId: req.user.id,
      username: req.user.fullName,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      action: 'DEVIATION_CAPA_ASSIGNED',
      resourceType: 'DEVIATION',
      resourceId: deviation.id,
      details: `QA Manager ${req.user.fullName} updated CAPA plan for Deviation #${deviation.deviationNumber}. Assigned to: ${assignedTo || deviation.capa.assignedTo}.`,
      fieldChanged: 'CAPA_PLAN',
      oldValue: JSON.stringify(deviation.capa),
      newValue: JSON.stringify(updatedCapa)
    });

    res.json({
      success: true,
      deviation: updatedDeviation,
      message: `CAPA action items assigned for Deviation #${deviation.deviationNumber}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update CAPA.' });
  }
});

// QA Manager Resolves & Signs off Deviation with 21 CFR Part 11 Digital Signature -> Releases Batch Hold
router.post(
  '/:id/resolve',
  authenticateToken,
  requireRole(['QA_QC_MANAGER', 'ADMIN']),
  verifyDigitalSignature,
  async (req, res) => {
    try {
      const { resolutionNotes, rootCauseConfirmed } = req.body;
      const deviation = await db.deviations.findById(req.params.id);

      if (!deviation) {
        return res.status(404).json({ success: false, message: 'Deviation not found.' });
      }

      const updatedCapa = {
        ...deviation.capa,
        rootCause: rootCauseConfirmed || deviation.capa.rootCause,
        resolutionNotes: resolutionNotes || 'CAPA verified by Quality Assurance.',
        completedAt: req.digitalSignature.signedAt,
        verifiedBy: {
          id: req.user.id,
          name: req.user.fullName,
          signature: req.digitalSignature.cryptographicStamp
        }
      };

      const updatedDeviation = await db.deviations.findByIdAndUpdate(deviation.id, {
        status: 'RESOLVED',
        capa: updatedCapa,
        holdPlaced: false,
        resolvedAt: req.digitalSignature.signedAt
      });

      // Check if other deviations are holding this batch
      const otherHolds = await db.deviations.find({
        batchId: deviation.batchId,
        holdPlaced: true,
        status: { $ne: 'RESOLVED' }
      });

      // If no more open holds on this batch, release the batch freeze!
      const batch = await db.batches.findById(deviation.batchId);
      if (batch && otherHolds.length === 0) {
        // Restore to previous operational status or compute from stage
        let restoredStatus = batch.previousStatus || 'WEIGHING';
        if (restoredStatus === 'HOLD') restoredStatus = 'COMPRESSION';

        await db.batches.findByIdAndUpdate(batch.id, {
          activeDeviationHold: false,
          status: restoredStatus
        });
      }

      await recordAuditLog({
        userId: req.user.id,
        username: req.user.fullName,
        userRole: req.user.role,
        ipAddress: req.ip || '127.0.0.1',
        action: 'DEVIATION_QA_RESOLVED',
        resourceType: 'DEVIATION',
        resourceId: deviation.id,
        details: `QA Manager ${req.user.fullName} resolved Deviation #${deviation.deviationNumber} and signed off CAPA. ${otherHolds.length === 0 ? `Batch #${deviation.batchNumber} HOLD released!` : 'Other holds remain.'}`,
        fieldChanged: 'DEVIATION_STATUS',
        oldValue: deviation.status,
        newValue: 'RESOLVED',
        digitalSignature: req.digitalSignature.cryptographicStamp
      });

      res.json({
        success: true,
        deviation: updatedDeviation,
        batchHoldReleased: otherHolds.length === 0,
        digitalSignature: req.digitalSignature,
        message: `Deviation #${deviation.deviationNumber} resolved with 21 CFR Part 11 Digital Signature. Batch hold lifted.`
      });
    } catch (err) {
      console.error('Deviation resolve error:', err);
      res.status(500).json({ success: false, message: 'Failed to resolve deviation.' });
    }
  }
);

export default router;
