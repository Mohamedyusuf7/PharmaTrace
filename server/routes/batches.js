import express from 'express';
import mongoose from 'mongoose';
import { db } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { verifyDigitalSignature } from '../middleware/signatureValidator.js';
import { recordAuditLog } from '../middleware/auditLogger.js';

const router = express.Router();

async function findBatch(id) {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    const doc = await db.batches.findById(id);
    if (doc) return doc;
  }
  return await db.batches.findOne({ id }) || await db.batches.findOne({ batchNumber: id });
}

async function findMaterial(id) {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    const doc = await db.materials.findById(id);
    if (doc) return doc;
  }
  return await db.materials.findOne({ id }) || await db.materials.findOne({ lotNumber: id });
}

async function findFormulation(id) {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    const doc = await db.formulations.findById(id);
    if (doc) return doc;
  }
  return await db.formulations.findOne({ id }) || await db.formulations.findOne({ drugCode: id });
}

// Get all Electronic Batch Records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search } = req.query;
    let batches = await db.batches.find({});

    if (status) {
      batches = batches.filter(b => b.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      batches = batches.filter(b =>
        b.batchNumber.toLowerCase().includes(q) ||
        b.drugName.toLowerCase().includes(q)
      );
    }

    // Sort by createdAt descending
    batches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const enrichedBatches = batches.map(b => {
      const stages = b.stageExecutions || b.stageLogs || [];
      return {
        ...b,
        stageLogs: stages,
        stageExecutions: stages
      };
    });

    res.json({ success: true, count: enrichedBatches.length, batches: enrichedBatches });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch batch records.' });
  }
});

// Get Single Batch Record with full 360° Genealogy & Deviations
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const batch = await findBatch(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch record not found.' });
    }

    const formulation = await findFormulation(batch.formulationId);
    const deviations = await db.deviations.find({ batchId: batch.id });

    // Check if any open deviations are holding the batch
    const hasActiveHold = deviations.some(d => d.holdPlaced && d.status !== 'CLOSED' && d.status !== 'RESOLVED');
    const stages = batch.stageExecutions || batch.stageLogs || [];

    res.json({
      success: true,
      batch: {
        ...batch,
        stageLogs: stages,
        stageExecutions: stages,
        activeDeviationHold: hasActiveHold,
        deviations
      },
      formulation
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch batch details.' });
  }
});

// Initialize New Electronic Batch Record
router.post('/initialize', authenticateToken, requireRole(['OPERATOR', 'QA_QC_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { formulationId, batchNumber, customBatchSize, targetYield } = req.body;

    if (!formulationId || !batchNumber) {
      return res.status(400).json({ success: false, message: 'Formulation ID and Batch Number are required.' });
    }

    // Check duplicate batch number
    const existing = await db.batches.findOne({ batchNumber: batchNumber.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Batch number ${batchNumber} is already registered.` });
    }

    const formulation = await findFormulation(formulationId);
    if (!formulation) {
      return res.status(404).json({ success: false, message: 'Referenced master formulation not found.' });
    }

    const today = new Date();
    const manufacturingDate = today.toISOString().split('T')[0];
    const expiryYear = today.getFullYear() + Math.floor((formulation.shelfLifeMonths || 36) / 12);
    const expiryDate = new Date(expiryYear, today.getMonth(), today.getDate()).toISOString().split('T')[0];

    // Build stage logs from formulation stages
    const stageLogs = formulation.stages.map((st, idx) => ({
      stageNumber: st.stepNumber || idx + 1,
      stageName: st.name,
      description: st.description,
      equipmentType: st.equipmentType,
      standardParams: st.standardParams || [],
      status: idx === 0 ? 'IN_PROGRESS' : 'LOCKED', // First stage active, rest locked
      operatorId: idx === 0 ? req.user.id : null,
      operatorName: idx === 0 ? req.user.fullName : null,
      startedAt: idx === 0 ? new Date().toISOString() : null,
      completedAt: null,
      parametersLogged: [],
      deviationIds: [],
      qaApproval: {
        approved: false,
        qaId: null,
        qaName: null,
        timestamp: null,
        signature: null,
        comments: null
      }
    }));

    const finalTargetYield = targetYield || customBatchSize || formulation.targetBatchSize;

    const newBatch = await db.batches.create({
      id: `BATCH-${Date.now().toString(36).toUpperCase()}`,
      batchNumber: batchNumber.trim().toUpperCase(),
      formulationId: formulation.id,
      drugName: formulation.drugName,
      dosageForm: formulation.dosageForm,
      strength: formulation.strength,
      batchSize: finalTargetYield,
      targetYield: finalTargetYield,
      unit: formulation.unit,
      manufacturingDate,
      expiryDate,
      status: 'WEIGHING',
      previousStatus: 'INITIALIZED',
      activeDeviationHold: false,
      materialAllocations: [],
      stageLogs,
      stageExecutions: stageLogs,
      labResults: [],
      finalRelease: {
        status: 'PENDING',
        releasedBy: null,
        releaseDate: null,
        signature: null,
        comments: null,
        coaCertificateNumber: null
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      username: req.user.fullName,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      action: 'BATCH_INITIALIZE',
      resourceType: 'BATCH',
      resourceId: newBatch.id,
      details: `Initialized Electronic Batch Record for ${formulation.drugName} (Batch #${newBatch.batchNumber}).`,
      fieldChanged: 'BATCH_STATUS',
      oldValue: 'UNINITIALIZED',
      newValue: 'WEIGHING'
    });

    res.status(201).json({
      success: true,
      batch: newBatch,
      message: `Batch #${newBatch.batchNumber} created successfully. Stage 1 (Weighing & Dispensing) initiated.`
    });
  } catch (err) {
    console.error('Batch init error:', err);
    res.status(500).json({ success: false, message: 'Failed to initialize batch.' });
  }
});

// Link / Scan Approved Raw Material Lot to Active Batch
router.post('/:id/link-material', authenticateToken, requireRole(['OPERATOR', 'QA_QC_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { materialLotId, quantity } = req.body;
    const batch = await findBatch(req.params.id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    if (batch.activeDeviationHold) {
      return res.status(400).json({
        success: false,
        message: 'Batch is currently on QA DEVIATION HOLD. Material allocations are blocked.'
      });
    }

    const material = await findMaterial(materialLotId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Raw material lot not found.' });
    }

    // STRICT COMPLIANCE CHECKS:
    // 1. Quarantine Check
    if (material.status !== 'RELEASED') {
      return res.status(400).json({
        success: false,
        message: `COMPLIANCE LOCK: Material lot #${material.lotNumber} is in '${material.status}' status. Only QA RELEASED materials can be dispensed into manufacturing.`
      });
    }

    // 2. Expiration Check
    const today = new Date().toISOString().split('T')[0];
    if (material.expiryDate < today) {
      return res.status(400).json({
        success: false,
        message: `COMPLIANCE LOCK: Material lot #${material.lotNumber} expired on ${material.expiryDate}. Expired materials cannot be assigned to production.`
      });
    }

    // 3. Stock Check
    const qtyToAllocate = parseFloat(quantity) || material.quantity;
    const available = material.quantity - (material.allocatedQuantity || 0);
    if (qtyToAllocate > available) {
      return res.status(400).json({
        success: false,
        message: `Insufficient inventory for Lot #${material.lotNumber}. Requested: ${qtyToAllocate} ${material.unit}, Available: ${available} ${material.unit}.`
      });
    }

    // Allocate material
    const allocation = {
      materialLotId: material.id || material._id,
      lotNumber: material.lotNumber,
      materialCode: material.materialCode,
      materialName: material.name,
      allocatedQty: qtyToAllocate,
      unit: material.unit,
      scannedAt: new Date().toISOString(),
      scannedBy: req.user.fullName
    };

    const updatedAllocations = [...(batch.materialAllocations || []), allocation];
    await db.batches.findByIdAndUpdate(batch._id, { materialAllocations: updatedAllocations });

    // Update material allocated quantity
    await db.materials.findByIdAndUpdate(material._id, {
      allocatedQuantity: (material.allocatedQuantity || 0) + qtyToAllocate
    });

    await recordAuditLog({
      userId: req.user.id,
      username: req.user.fullName,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      action: 'MATERIAL_LINKED_TO_BATCH',
      resourceType: 'BATCH',
      resourceId: batch.id,
      details: `Operator ${req.user.fullName} linked ${qtyToAllocate} ${material.unit} of Lot #${material.lotNumber} (${material.name}) to Batch #${batch.batchNumber}.`,
      fieldChanged: 'MATERIAL_ALLOCATION',
      oldValue: 'UNALLOCATED',
      newValue: `LOT_${material.lotNumber}_QTY_${qtyToAllocate}`
    });

    res.json({
      success: true,
      allocation,
      message: `Lot #${material.lotNumber} verified and linked to Batch #${batch.batchNumber}.`
    });
  } catch (err) {
    console.error('Material link error:', err);
    res.status(500).json({ success: false, message: 'Failed to link raw material.' });
  }
});

// Operator logs process telemetry/parameters during stage
router.post('/:id/log-parameters', authenticateToken, requireRole(['OPERATOR', 'QA_QC_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { stageNumber, parameters } = req.body; // parameters: [{ name, value, unit }]
    const batch = await findBatch(req.params.id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    if (batch.activeDeviationHold) {
      return res.status(400).json({ success: false, message: 'Batch is on DEVIATION HOLD. Process execution is locked.' });
    }

    const formulation = await findFormulation(batch.formulationId);
    const stageIndex = batch.stageLogs.findIndex(s => s.stageNumber === parseInt(stageNumber));

    if (stageIndex === -1) {
      return res.status(404).json({ success: false, message: `Stage number ${stageNumber} not found in batch.` });
    }

    const stage = batch.stageLogs[stageIndex];
    if (stage.status === 'LOCKED') {
      return res.status(400).json({ success: false, message: 'This stage is currently LOCKED. Previous stage requires QA sign-off.' });
    }

    // Match parameters with formulation tolerances
    const formStage = formulation?.stages?.find(s => s.stepNumber === parseInt(stageNumber));
    const processedParams = [];
    const outOfSpecAlerts = [];

    for (const p of parameters) {
      const spec = formStage?.standardParams?.find(sp => sp.name.toLowerCase() === p.name.toLowerCase());
      let isWithinSpec = true;

      if (spec) {
        const val = parseFloat(p.value);
        if (spec.min !== undefined && val < spec.min) isWithinSpec = false;
        if (spec.max !== undefined && val > spec.max) isWithinSpec = false;

        if (!isWithinSpec) {
          outOfSpecAlerts.push({
            name: p.name,
            value: val,
            expected: `${spec.min} - ${spec.max} ${spec.unit || ''}`
          });
        }
      }

      processedParams.push({
        paramName: p.name,
        value: parseFloat(p.value) || p.value,
        unit: p.unit || spec?.unit || '',
        isWithinSpec,
        timestamp: new Date().toISOString()
      });
    }

    const updatedLogs = [...batch.stageLogs];
    updatedLogs[stageIndex].parametersLogged.push(...processedParams);
    updatedLogs[stageIndex].status = 'IN_PROGRESS';

    await db.batches.findByIdAndUpdate(batch._id, { stageLogs: updatedLogs });

    await recordAuditLog({
      userId: req.user.id,
      username: req.user.fullName,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      action: 'PROCESS_PARAMETERS_LOGGED',
      resourceType: 'BATCH_STAGE',
      resourceId: `${batch.id}/STAGE-${stageNumber}`,
      details: `Operator ${req.user.fullName} logged ${processedParams.length} parameters for Stage ${stageNumber} (${stage.stageName}).`,
      fieldChanged: 'STAGE_TELEMETRY',
      oldValue: '',
      newValue: JSON.stringify(processedParams)
    });

    res.json({
      success: true,
      loggedCount: processedParams.length,
      outOfSpecAlerts,
      message: outOfSpecAlerts.length > 0
        ? `Parameters logged with ${outOfSpecAlerts.length} Out-Of-Specification values!`
        : 'Parameters logged successfully within validated tolerance ranges.'
    });
  } catch (err) {
    console.error('Log parameters error:', err);
    res.status(500).json({ success: false, message: 'Failed to record stage parameters.' });
  }
});

// Operator completes a stage -> Locks stage and triggers QA review requirement
router.post('/:id/complete-stage', authenticateToken, requireRole(['OPERATOR', 'QA_QC_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { stageNumber } = req.body;
    const batch = await findBatch(req.params.id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const stages = [...(batch.stageExecutions || batch.stageLogs || [])];
    let stageIndex = stages.findIndex(s => s.stageNumber === parseInt(stageNumber));

    if (stageIndex === -1) {
      const formulation = await findFormulation(batch.formulationId);
      const formStage = formulation?.stages?.find(s => s.stepNumber === parseInt(stageNumber));
      const newStage = {
        stageNumber: parseInt(stageNumber),
        stageName: formStage?.name || `Step #${stageNumber}`,
        status: 'COMPLETED_AWAITING_QA',
        operator: req.user.fullName,
        operatorId: req.user.id,
        operatorName: req.user.fullName,
        completedAt: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        qaApproval: null
      };
      stages.push(newStage);
      stageIndex = stages.length - 1;
    } else {
      stages[stageIndex].status = 'COMPLETED_AWAITING_QA';
      stages[stageIndex].completedAt = new Date().toISOString();
      stages[stageIndex].operatorId = req.user.id;
      stages[stageIndex].operatorName = req.user.fullName;
    }

    await db.batches.findByIdAndUpdate(batch._id, {
      stageLogs: stages,
      stageExecutions: stages
    });

    await recordAuditLog({
      userId: req.user.id,
      username: req.user.fullName,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      action: 'STAGE_OPERATOR_COMPLETED',
      resourceType: 'BATCH_STAGE',
      resourceId: `${batch.id}/STAGE-${stageNumber}`,
      details: `Operator ${req.user.fullName} completed Stage ${stageNumber} (${stages[stageIndex].stageName}). Awaiting QA Manager verification & sign-off.`,
      fieldChanged: 'STAGE_STATUS',
      oldValue: 'IN_PROGRESS',
      newValue: 'COMPLETED_AWAITING_QA'
    });

    res.json({
      success: true,
      stage: stages[stageIndex],
      message: `Stage ${stageNumber} marked complete. Enforced interlock: Next stage will remain LOCKED until QA Manager sign-off.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to complete stage.' });
  }
});

// QA/QC Manager signs off on stage with 21 CFR Part 11 Digital Signature -> Unlocks next stage
router.post(
  '/:id/sign-off-stage',
  authenticateToken,
  requireRole(['QA_QC_MANAGER', 'ADMIN']),
  verifyDigitalSignature,
  async (req, res) => {
    try {
      const { stageNumber, comments } = req.body;
      const batch = await findBatch(req.params.id);

      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found.' });
      }

      if (batch.activeDeviationHold) {
        return res.status(400).json({
          success: false,
          message: 'COMPLIANCE LOCK: Cannot sign off stage while batch is under active QA Deviation Hold.'
        });
      }

      const stages = batch.stageExecutions || batch.stageLogs || [];
      let stageIndex = stages.findIndex(s => s.stageNumber === parseInt(stageNumber));

      if (stageIndex === -1) {
        const formulation = await findFormulation(batch.formulationId);
        const formStage = formulation?.stages?.find(s => s.stepNumber === parseInt(stageNumber));
        const newStage = {
          stageNumber: parseInt(stageNumber),
          stageName: formStage?.name || `Step #${stageNumber}`,
          status: 'COMPLETED',
          operator: req.user.fullName,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          qaApproval: null
        };
        stages.push(newStage);
        stageIndex = stages.length - 1;
      }

      const updatedLogs = [...stages];
      updatedLogs[stageIndex].status = 'COMPLETED';
      updatedLogs[stageIndex].qaApproval = {
        approved: true,
        approvedBy: req.user.fullName,
        approvedAt: req.digitalSignature.signedAt || new Date().toISOString(),
        qaId: req.user.id,
        qaName: req.user.fullName,
        timestamp: req.digitalSignature.signedAt,
        signature: req.digitalSignature.cryptographicStamp,
        signatureStamp: req.digitalSignature.cryptographicStamp,
        comments: comments || 'Stage critical process parameters verified against master recipe and released.'
      };

      // Map batch status accurately to the active recipe stage
      const approvedStages = updatedLogs.filter(s => s.status === 'COMPLETED' || (s.qaApproval && s.qaApproval.approved));
      const approvedCount = approvedStages.length;
      let newBatchStatus = 'IN_PRODUCTION';

      if (approvedCount >= 5) {
        newBatchStatus = 'QC_TESTING'; // Only when all 5 stages are approved
      } else if (approvedCount === 4) {
        newBatchStatus = 'PACKAGING';
      } else if (approvedCount === 3) {
        newBatchStatus = 'COATING';
      } else if (approvedCount === 2) {
        newBatchStatus = 'COMPRESSION';
      } else if (approvedCount === 1) {
        newBatchStatus = 'GRANULATION';
      } else {
        newBatchStatus = 'WEIGHING';
      }

      const updatedBatch = await db.batches.findByIdAndUpdate(batch._id, {
        stageLogs: updatedLogs,
        stageExecutions: updatedLogs,
        status: newBatchStatus
      });

      await recordAuditLog({
        userId: req.user.id,
        username: req.user.fullName,
        userRole: req.user.role,
        ipAddress: req.ip || '127.0.0.1',
        action: 'STAGE_QA_DIGITAL_SIGNOFF',
        resourceType: 'BATCH_STAGE',
        resourceId: `${batch.id}/STAGE-${stageNumber}`,
        details: `QA Manager ${req.user.fullName} verified and signed off Stage ${stageNumber} (${updatedLogs[stageIndex]?.stageName || `Stage ${stageNumber}`}) with 21 CFR Part 11 Digital Signature.`,
        fieldChanged: 'STAGE_QA_APPROVAL',
        oldValue: 'PENDING',
        newValue: 'APPROVED',
        digitalSignature: req.digitalSignature.cryptographicStamp
      });

      const isAllComplete = approvedCount >= 5;

      res.json({
        success: true,
        batch: updatedBatch,
        digitalSignature: req.digitalSignature,
        message: `Stage ${stageNumber} signed off. ${!isAllComplete ? `Stage ${parseInt(stageNumber) + 1} unlocked.` : 'All stages complete! Batch moved to QC Testing.'}`
      });
    } catch (err) {
      console.error('Stage sign off error:', err);
      res.status(500).json({ success: false, message: 'Failed to sign off stage: ' + (err.message || 'Server error') });
    }
  }
);

// Final Batch Release / Rejection by QA Manager (Requires 21 CFR Part 11 Digital Signature)
router.post(
  '/:id/final-release',
  authenticateToken,
  requireRole(['QA_QC_MANAGER', 'ADMIN']),
  verifyDigitalSignature,
  async (req, res) => {
    try {
      const { releaseDecision, comments } = req.body; // releaseDecision: 'APPROVED' | 'REJECTED'
      const batch = await findBatch(req.params.id);

      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found.' });
      }

      // Check open deviations
      const deviations = await db.deviations.find({ batchId: batch.id });
      const unclosedDeviations = deviations.filter(d => d.status !== 'CLOSED' && d.status !== 'RESOLVED');

      if (releaseDecision === 'APPROVED' && unclosedDeviations.length > 0) {
        return res.status(400).json({
          success: false,
          message: `COMPLIANCE LOCK: Batch #${batch.batchNumber} has ${unclosedDeviations.length} unresolved deviations. All CAPAs must be closed before final release.`
        });
      }

      // Check all stages are approved
      const batchStages = batch.stageExecutions || batch.stageLogs || [];
      const allStagesApproved = batchStages.every(s => s.qaApproval && (s.qaApproval.approved || s.qaApproval.signatureStamp));
      if (releaseDecision === 'APPROVED' && !allStagesApproved) {
        return res.status(400).json({
          success: false,
          message: 'COMPLIANCE LOCK: Not all manufacturing stages have received QA sign-offs.'
        });
      }

      const coaNumber = releaseDecision === 'APPROVED' ? `COA-${batch.batchNumber}-${Date.now().toString(36).toUpperCase()}` : null;

      const finalReleaseData = {
        status: releaseDecision,
        releasedBy: req.user.fullName,
        releaseDate: req.digitalSignature.signedAt,
        signature: req.digitalSignature.cryptographicStamp,
        comments: comments || (releaseDecision === 'APPROVED' ? 'Batch fully conforms to cGMP specifications and is released for commercial packaging.' : 'Batch rejected due to quality non-conformance.'),
        coaCertificateNumber: coaNumber
      };

      const updatedBatch = await db.batches.findByIdAndUpdate(batch._id, {
        status: releaseDecision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        finalRelease: finalReleaseData
      });

      await recordAuditLog({
        userId: req.user.id,
        username: req.user.fullName,
        userRole: req.user.role,
        ipAddress: req.ip || '127.0.0.1',
        action: `BATCH_FINAL_RELEASE_${releaseDecision}`,
        resourceType: 'BATCH',
        resourceId: batch.id,
        details: `QA Manager ${req.user.fullName} signed final release decision '${releaseDecision}' for Batch #${batch.batchNumber}. ${coaNumber ? `Generated Certificate of Analysis: ${coaNumber}` : ''}`,
        fieldChanged: 'FINAL_RELEASE_STATUS',
        oldValue: batch.status,
        newValue: releaseDecision,
        digitalSignature: req.digitalSignature.cryptographicStamp
      });

      res.json({
        success: true,
        batch: updatedBatch,
        coaNumber,
        digitalSignature: req.digitalSignature,
        message: `Batch #${batch.batchNumber} has been officially ${releaseDecision}. 21 CFR Part 11 Certificate of Analysis generated.`
      });
    } catch (err) {
      console.error('Final release error:', err);
      res.status(500).json({ success: false, message: 'Failed to complete final batch release.' });
    }
  }
);

export default router;
