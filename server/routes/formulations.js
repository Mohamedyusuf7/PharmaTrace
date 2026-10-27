import express from 'express';
import { db } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/auditLogger.js';

const router = express.Router();

// Get all master drug formulations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const formulations = await db.formulations.find({});
    res.json({ success: true, count: formulations.length, formulations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch formulations.' });
  }
});

// Get single formulation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const formulation = await db.formulations.findById(req.params.id);
    if (!formulation) {
      return res.status(404).json({ success: false, message: 'Formulation not found.' });
    }
    res.json({ success: true, formulation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch formulation.' });
  }
});

// Create new master formulation (Admin / QA only)
router.post('/', authenticateToken, requireRole(['ADMIN', 'QA_QC_MANAGER']), async (req, res) => {
  try {
    const { drugCode, drugName, dosageForm, strength, targetBatchSize, unit, shelfLifeMonths, storageCondition, bom, stages, specifications } = req.body;

    if (!drugCode || !drugName || !targetBatchSize || !bom || !stages) {
      return res.status(400).json({ success: false, message: 'Missing mandatory formulation fields.' });
    }

    const newFormulation = await db.formulations.create({
      id: `FORM-${Date.now().toString(36).toUpperCase()}`,
      drugCode: drugCode.trim(),
      drugName: drugName.trim(),
      dosageForm: dosageForm || 'Tablet',
      strength: strength || '500 mg',
      targetBatchSize: parseFloat(targetBatchSize),
      unit: unit || 'Tablets',
      shelfLifeMonths: parseInt(shelfLifeMonths) || 36,
      storageCondition: storageCondition || 'Store in controlled room temperature below 25°C',
      bom: bom || [],
      stages: stages || [],
      specifications: specifications || {
        purityMin: 98.0,
        purityMax: 102.0,
        dissolutionMin: 80.0,
        phMin: 5.0,
        phMax: 7.0
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      username: req.user.fullName,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      action: 'FORMULATION_CREATE',
      resourceType: 'FORMULATION',
      resourceId: newFormulation.id,
      details: `Created new master drug recipe ${drugName} (${drugCode}).`,
      fieldChanged: 'FORMULATION_REGISTRY',
      oldValue: 'NULL',
      newValue: newFormulation.id
    });

    res.status(201).json({ success: true, formulation: newFormulation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create formulation.' });
  }
});

export default router;
