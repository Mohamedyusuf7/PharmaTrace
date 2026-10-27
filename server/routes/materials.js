import express from 'express';
import mongoose from 'mongoose';
import { db } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { verifyDigitalSignature } from '../middleware/signatureValidator.js';
import { recordAuditLog } from '../middleware/auditLogger.js';

const router = express.Router();

async function findMaterial(id) {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    const doc = await db.materials.findById(id);
    if (doc) return doc;
  }
  return await db.materials.findOne({ id }) || await db.materials.findOne({ lotNumber: id });
}

// Get all raw materials with filter options
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    let materials = await db.materials.find({});

    if (status) {
      materials = materials.filter(m => m.status === status);
    }
    if (category) {
      materials = materials.filter(m => m.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      materials = materials.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.lotNumber.toLowerCase().includes(q) ||
        m.materialCode.toLowerCase().includes(q) ||
        m.vendor.toLowerCase().includes(q)
      );
    }

    // Auto calculate expiry flags
    const today = new Date().toISOString().split('T')[0];
    const enriched = materials.map(m => ({
      ...m,
      isExpired: m.expiryDate < today,
      isQuarantine: m.status === 'QUARANTINE',
      availableQuantity: Math.max(0, (m.quantity || 0) - (m.allocatedQuantity || 0))
    }));

    res.json({ success: true, count: enriched.length, materials: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch raw materials.' });
  }
});

// Get single material by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const material = await findMaterial(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material lot not found.' });
    }

    const today = new Date().toISOString().split('T')[0];
    res.json({
      success: true,
      material: {
        ...material,
        isExpired: material.expiryDate < today,
        isQuarantine: material.status === 'QUARANTINE',
        availableQuantity: Math.max(0, (material.quantity || 0) - (material.allocatedQuantity || 0))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch material details.' });
  }
});

// Intake New Chemical Shipment (Allowed for Operator, QA Manager, Admin)
router.post('/shipment-intake', authenticateToken, requireRole(['OPERATOR', 'QA_QC_MANAGER', 'QA_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const {
      materialCode,
      name,
      category,
      lotNumber,
      vendor,
      quantity,
      unit,
      receivedDate,
      expiryDate,
      coaNumber,
      storageCondition,
      notes
    } = req.body;

    if (!materialCode || !name || !lotNumber || !vendor || !quantity || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Mandatory intake fields missing (materialCode, name, lotNumber, vendor, quantity, expiryDate).'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    if (expiryDate <= today) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment: Raw material expiry date cannot be in the past.'
      });
    }

    // Check duplicate lot
    const existingLot = await db.materials.findOne({ lotNumber: lotNumber.trim() });
    if (existingLot) {
      return res.status(400).json({
        success: false,
        message: `Lot number ${lotNumber} is already registered in the system.`
      });
    }

    const newMaterial = await db.materials.create({
      id: `MAT-${Date.now().toString(36).toUpperCase()}`,
      materialCode: materialCode.trim(),
      name: name.trim(),
      category: category || 'Raw Material',
      lotNumber: lotNumber.trim(),
      vendor: vendor.trim(),
      quantity: parseFloat(quantity),
      allocatedQuantity: 0.0,
      unit: unit || 'kg',
      receivedDate: receivedDate || today,
      expiryDate: expiryDate,
      status: 'QUARANTINE', // Automatic quarantine enforcement
      coaNumber: coaNumber || `COA-IN-${lotNumber}`,
      storageCondition: storageCondition || 'Controlled Room Temperature',
      testedBy: null,
      releasedBy: null,
      releaseTimestamp: null,
      releaseSignature: null,
      notes: notes || 'New shipment received in warehouse. Placed on physical and digital Quarantine hold.'
    });

    await recordAuditLog({
      userId: req.user.id,
      username: req.user.fullName,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      action: 'MATERIAL_SHIPMENT_INTAKE',
      resourceType: 'MATERIAL',
      resourceId: newMaterial.id,
      details: `Received shipment of ${name} (Lot #${lotNumber}, ${quantity} ${unit}) from ${vendor}. Automatic QUARANTINE status assigned.`,
      fieldChanged: 'STATUS',
      oldValue: 'UNREGISTERED',
      newValue: 'QUARANTINE'
    });

    res.status(201).json({
      success: true,
      material: newMaterial,
      message: `Shipment logged successfully. Lot #${lotNumber} is placed in QUARANTINE awaiting QA release.`
    });
  } catch (err) {
    console.error('Shipment intake error:', err);
    res.status(500).json({ success: false, message: 'Failed to record shipment intake.' });
  }
});

// QA Release / Rejection from Quarantine (Requires 21 CFR Part 11 Digital Signature)
router.post(
  '/:id/quarantine-action',
  authenticateToken,
  requireRole(['QA_QC_MANAGER', 'ADMIN']),
  verifyDigitalSignature,
  async (req, res) => {
    try {
      const { action, testResultsSummary, rejectionReason } = req.body;
      const material = await findMaterial(req.params.id);

      if (!material) {
        return res.status(404).json({ success: false, message: 'Material lot not found.' });
      }

      if (material.status !== 'QUARANTINE') {
        return res.status(400).json({
          success: false,
          message: `Material is currently in status '${material.status}', not in QUARANTINE.`
        });
      }

      const targetStatus = action === 'RELEASE' ? 'RELEASED' : 'REJECTED';
      const updatedMaterial = await db.materials.findByIdAndUpdate(material._id, {
        status: targetStatus,
        testedBy: req.user.fullName,
        releasedBy: req.user.fullName,
        releaseTimestamp: req.digitalSignature.signedAt,
        releaseSignature: req.digitalSignature.cryptographicStamp,
        notes: action === 'RELEASE'
          ? `Cleared QA laboratory testing. ${testResultsSummary || 'Meets all USP/EP monograph release specifications.'}`
          : `QA REJECTED: ${rejectionReason || 'Failed monograph test criteria. Material quarantined for return/destruction.'}`
      });

      await recordAuditLog({
        userId: req.user.id,
        username: req.user.fullName,
        userRole: req.user.role,
        ipAddress: req.ip || '127.0.0.1',
        action: `MATERIAL_QUARANTINE_${targetStatus}`,
        resourceType: 'MATERIAL',
        resourceId: material.id,
        details: `QA Manager ${req.user.fullName} changed lot #${material.lotNumber} status from QUARANTINE to ${targetStatus}.`,
        fieldChanged: 'STATUS',
        oldValue: 'QUARANTINE',
        newValue: targetStatus,
        digitalSignature: req.digitalSignature.cryptographicStamp
      });

      res.json({
        success: true,
        material: updatedMaterial,
        digitalSignature: req.digitalSignature,
        message: `Lot #${material.lotNumber} has been ${targetStatus}. 21 CFR Part 11 Digital Signature recorded.`
      });
    } catch (err) {
      console.error('Quarantine action error:', err);
      res.status(500).json({ success: false, message: 'Failed to process quarantine disposition.' });
    }
  }
);

// Check material availability and validation for a formulation recipe
router.get('/validate-bom/:formulationId', authenticateToken, async (req, res) => {
  try {
    const formulation = await db.formulations.findById(req.params.formulationId);
    if (!formulation) {
      return res.status(404).json({ success: false, message: 'Formulation not found.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const validationReport = [];

    for (const item of formulation.bom) {
      const availableLots = await db.materials.find({
        materialCode: item.materialCode,
        status: 'RELEASED'
      });

      const validLots = availableLots.filter(l => l.expiryDate > today && (l.quantity - (l.allocatedQuantity || 0)) > 0);
      const totalAvailable = validLots.reduce((acc, l) => acc + (l.quantity - (l.allocatedQuantity || 0)), 0);

      validationReport.push({
        materialCode: item.materialCode,
        materialName: item.materialName,
        requiredQty: item.requiredQty,
        unit: item.unit,
        totalAvailable,
        isSufficient: totalAvailable >= item.requiredQty,
        validLots: validLots.map(l => ({
          id: l.id,
          lotNumber: l.lotNumber,
          available: l.quantity - (l.allocatedQuantity || 0),
          unit: l.unit,
          expiryDate: l.expiryDate,
          vendor: l.vendor
        }))
      });
    }

    res.json({
      success: true,
      formulation: formulation.drugName,
      allAvailable: validationReport.every(r => r.isSufficient),
      report: validationReport
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to validate BOM materials.' });
  }
});

export default router;
