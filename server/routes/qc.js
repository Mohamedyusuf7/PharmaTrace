import express from 'express';
import { db } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/auditLogger.js';

const router = express.Router();

// Get QC Dashboard overview
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const batches = await db.batches.find({});
    const pendingTesting = batches.filter(b => b.status === 'QC_TESTING' || b.status === 'PACKAGING');
    const releasedBatches = batches.filter(b => b.status === 'APPROVED');
    const rejectedBatches = batches.filter(b => b.status === 'REJECTED');
    const onHoldBatches = batches.filter(b => b.status === 'HOLD' || b.activeDeviationHold);

    res.json({
      success: true,
      metrics: {
        pendingQC: pendingTesting.length,
        approvedTotal: releasedBatches.length,
        rejectedTotal: rejectedBatches.length,
        onHoldTotal: onHoldBatches.length
      },
      pendingTesting
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch QC dashboard.' });
  }
});

// Record Lab Test Results for a Batch with Automated Out-of-Specification (OOS) Detection
router.post('/batches/:id/lab-results', authenticateToken, requireRole(['QA_QC_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { tests } = req.body; // tests: [{ testName, parameter, resultValue, unit }]
    const batch = await db.batches.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const formulation = await db.formulations.findById(batch.formulationId);
    const specs = formulation?.specifications || {};

    const evaluatedTests = [];
    const oosIssues = [];

    for (const t of tests) {
      let isConforming = true;
      let standardRange = 'Per USP Monograph';
      const val = parseFloat(t.resultValue);

      if (t.testName.toLowerCase().includes('purity') || t.testName.toLowerCase().includes('assay')) {
        const min = specs.purityMin || 98.0;
        const max = specs.purityMax || 102.0;
        standardRange = `${min}% - ${max}%`;
        if (val < min || val > max) {
          isConforming = false;
          oosIssues.push({ test: t.testName, value: val, spec: standardRange, severity: 'CRITICAL' });
        }
      } else if (t.testName.toLowerCase().includes('dissolution')) {
        const min = specs.dissolutionMin || 80.0;
        standardRange = `≥ ${min}% at 45 min`;
        if (val < min) {
          isConforming = false;
          oosIssues.push({ test: t.testName, value: val, spec: standardRange, severity: 'MAJOR' });
        }
      } else if (t.testName.toLowerCase().includes('ph')) {
        const min = specs.phMin || 5.0;
        const max = specs.phMax || 7.0;
        standardRange = `${min} - ${max}`;
        if (val < min || val > max) {
          isConforming = false;
          oosIssues.push({ test: t.testName, value: val, spec: standardRange, severity: 'MAJOR' });
        }
      } else if (t.testName.toLowerCase().includes('hardness') && specs.hardnessMin) {
        standardRange = `${specs.hardnessMin} - ${specs.hardnessMax} kp`;
        if (val < specs.hardnessMin || val > specs.hardnessMax) {
          isConforming = false;
          oosIssues.push({ test: t.testName, value: val, spec: standardRange, severity: 'MINOR' });
        }
      }

      evaluatedTests.push({
        testName: t.testName,
        parameter: t.parameter || t.testName,
        standardRange,
        resultValue: parseFloat(t.resultValue) || t.resultValue,
        unit: t.unit || '%',
        isConforming,
        testedBy: req.user.fullName,
        testDate: new Date().toISOString().split('T')[0]
      });
    }

    const updatedLabResults = [...(batch.labResults || []), ...evaluatedTests];
    let newStatus = batch.status;
    let autoDeviationCreated = null;

    // AUTOMATED OOS REACTION: If any test fails, automatically place on HOLD and create Deviation ticket
    if (oosIssues.length > 0) {
      newStatus = 'HOLD';

      const devTitle = `Automated OOS Alert: ${oosIssues.map(o => `${o.test} (${o.value}) out of spec (${o.spec})`).join(', ')}`;
      autoDeviationCreated = await db.deviations.create({
        id: `DEV-AUTO-${Date.now().toString(36).toUpperCase()}`,
        deviationNumber: `DEV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        title: devTitle,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        stageNumber: 99,
        stageName: "Quality Control Analytical Testing",
        severity: oosIssues.some(o => o.severity === 'CRITICAL') ? 'CRITICAL' : 'MAJOR',
        description: `Automated laboratory analyzer detected out-of-specification results during monograph testing: ${JSON.stringify(oosIssues)}`,
        immediateActionTaken: "Batch automatically placed on QA HOLD. Quarantine lock activated across manufacturing and packaging lines.",
        loggedBy: { id: req.user.id, name: req.user.fullName, role: req.user.role },
        status: "OPEN",
        capa: {
          actionPlan: "Conduct re-assay with secondary reference standard, investigate HPLC column integration, and review raw material lot blend.",
          rootCause: "Under laboratory investigation",
          assignedTo: "Lead QC Analyst Dr. Marcus Webb",
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          completedAt: null,
          resolutionNotes: null,
          verifiedBy: null
        },
        holdPlaced: true,
        createdAt: new Date().toISOString(),
        resolvedAt: null
      });
    }

    await db.batches.findByIdAndUpdate(batch.id, {
      labResults: updatedLabResults,
      status: newStatus,
      activeDeviationHold: oosIssues.length > 0
    });

    await recordAuditLog({
      userId: req.user.id,
      username: req.user.fullName,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      action: 'QC_LAB_RESULTS_LOGGED',
      resourceType: 'BATCH',
      resourceId: batch.id,
      details: `QC Analyst ${req.user.fullName} logged ${evaluatedTests.length} analytical test results. Conforming: ${evaluatedTests.filter(t => t.isConforming).length}/${evaluatedTests.length}.${oosIssues.length > 0 ? ` WARNING: OOS detected. Automated Deviation #${autoDeviationCreated?.deviationNumber} generated.` : ''}`,
      fieldChanged: 'LAB_RESULTS',
      oldValue: '',
      newValue: JSON.stringify(evaluatedTests)
    });

    res.json({
      success: true,
      evaluatedTests,
      hasOosIssues: oosIssues.length > 0,
      oosIssues,
      autoDeviation: autoDeviationCreated,
      message: oosIssues.length > 0
        ? `ALERT: Out-of-Specification detected! Batch #${batch.batchNumber} has been automatically placed on HOLD and Deviation #${autoDeviationCreated?.deviationNumber} opened.`
        : `All ${evaluatedTests.length} analytical laboratory tests passed within specifications.`
    });
  } catch (err) {
    console.error('Lab test logging error:', err);
    res.status(500).json({ success: false, message: 'Failed to record lab test results.' });
  }
});

export default router;
