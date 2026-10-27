import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialFormulations, generateInitialSeed } from '../utils/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_FILE = path.join(__dirname, '..', 'storage.json');

// Mongoose Schemas Definition
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  username: { type: String, required: true, unique: true },
  fullName: String,
  email: String,
  role: String,
  department: String,
  employeeId: String,
  passwordHash: String,
  pinHash: String,
  active: { type: Boolean, default: true },
  createdAt: String
}, { strict: false });

const materialSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  materialCode: String,
  name: String,
  category: String,
  lotNumber: { type: String, unique: true },
  vendor: String,
  quantity: Number,
  allocatedQuantity: Number,
  unit: String,
  receivedDate: String,
  expiryDate: String,
  status: String, // QUARANTINE | RELEASED | REJECTED
  coaNumber: String,
  storageCondition: String,
  testedBy: String,
  releasedBy: String,
  releaseTimestamp: String,
  releaseSignature: String,
  notes: String
}, { strict: false });

const formulationSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  drugCode: String,
  drugName: String,
  dosageForm: String,
  strength: String,
  targetBatchSize: Number,
  unit: String,
  shelfLifeMonths: Number,
  storageCondition: String,
  bom: Array,
  stages: Array,
  specifications: Object
}, { strict: false });

const batchSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  batchNumber: { type: String, unique: true },
  formulationId: String,
  drugName: String,
  dosageForm: String,
  targetYield: Number,
  plannedStartDate: String,
  actualStartDate: String,
  actualEndDate: String,
  status: String, // CREATED | WEIGHING | GRANULATION | COMPRESSION | COATING | PACKAGING | QC_TESTING | APPROVED | REJECTED | HOLD
  previousStatus: String,
  activeDeviationHold: Boolean,
  currentStageIndex: Number,
  allocatedLots: Array,
  stageExecutions: Array,
  labResults: Array,
  qaApproval: Object,
  genealogy: Object,
  createdBy: Object,
  createdAt: String
}, { strict: false });

const deviationSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  deviationNumber: String,
  title: String,
  batchId: String,
  batchNumber: String,
  stageNumber: Number,
  stageName: String,
  severity: String, // MINOR | MAJOR | CRITICAL
  description: String,
  immediateActionTaken: String,
  loggedBy: Object,
  status: String, // OPEN | CAPA_ASSIGNED | RESOLVED
  capa: Object,
  holdPlaced: Boolean,
  createdAt: String,
  resolvedAt: String
}, { strict: false });

const auditLogSchema = new mongoose.Schema({
  id: String,
  eventId: String,
  timestamp: String,
  userId: String,
  username: String,
  userRole: String,
  ipAddress: String,
  action: String,
  resourceType: String,
  resourceId: String,
  details: String,
  fieldChanged: String,
  oldValue: String,
  newValue: String,
  digitalSignature: String,
  prevHash: String,
  hash: String
}, { strict: false });

const digitalSignatureSchema = new mongoose.Schema({
  signatureId: String,
  userId: String,
  username: String,
  userRole: String,
  reason: String,
  targetType: String,
  targetId: String,
  timestamp: String,
  cryptographicStamp: String,
  hashDigest: String,
  ipAddress: String,
  userAgent: String
}, { strict: false });

// Register Mongoose Models
const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
const MaterialModel = mongoose.models.Material || mongoose.model('Material', materialSchema);
const FormulationModel = mongoose.models.Formulation || mongoose.model('Formulation', formulationSchema);
const BatchModel = mongoose.models.Batch || mongoose.model('Batch', batchSchema);
const DeviationModel = mongoose.models.Deviation || mongoose.model('Deviation', deviationSchema);
const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
const DigitalSignatureModel = mongoose.models.DigitalSignature || mongoose.model('DigitalSignature', digitalSignatureSchema);

let isMongoConnected = false;

// File Storage Helper for Offline / Fallback mode
function loadFileStorage() {
  if (!fs.existsSync(STORAGE_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function saveFileStorage(data) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Global In-Memory File Data cache when Mongo is offline
let memoryDb = null;

// Generic Collection Wrapper for Seamless Mongo / Memory Switching
function createCollectionAdapter(model, keyInStore) {
  return {
    async find(query = {}) {
      if (isMongoConnected) {
        let q = model.find(query);
        const docs = await q.exec();
        return docs.map(d => d.toObject());
      } else {
        let items = [...(memoryDb[keyInStore] || [])];
        if (Object.keys(query).length > 0) {
          items = items.filter(item => {
            return Object.entries(query).every(([k, v]) => {
              if (v && typeof v === 'object' && v.$ne !== undefined) {
                return item[k] !== v.$ne;
              }
              return item[k] === v;
            });
          });
        }
        return items;
      }
    },
    async findOne(query = {}) {
      if (isMongoConnected) {
        const doc = await model.findOne(query).exec();
        return doc ? doc.toObject() : null;
      } else {
        const items = memoryDb[keyInStore] || [];
        const item = items.find(i => {
          return Object.entries(query).every(([k, v]) => i[k] === v);
        });
        return item || null;
      }
    },
    async findById(id) {
      if (isMongoConnected) {
        let doc = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          doc = await model.findById(id).exec();
        }
        if (!doc) {
          doc = await model.findOne({ id }).exec();
        }
        return doc ? doc.toObject() : null;
      } else {
        const items = memoryDb[keyInStore] || [];
        return items.find(i => i.id === id || i._id === id) || null;
      }
    },
    async create(doc) {
      if (isMongoConnected) {
        const newDoc = await model.create(doc);
        return newDoc.toObject();
      } else {
        const newObj = { ...doc };
        if (!newObj.id) newObj.id = `ID-${Date.now().toString(36)}`;
        memoryDb[keyInStore].push(newObj);
        saveFileStorage(memoryDb);
        return newObj;
      }
    },
    async findByIdAndUpdate(id, updateData) {
      if (isMongoConnected) {
        let updated = await model.findOneAndUpdate({ id }, updateData, { new: true }).exec();
        if (!updated && mongoose.Types.ObjectId.isValid(id)) {
          updated = await model.findByIdAndUpdate(id, updateData, { new: true }).exec();
        }
        return updated ? updated.toObject() : null;
      } else {
        const items = memoryDb[keyInStore] || [];
        const idx = items.findIndex(i => i.id === id || i._id === id);
        if (idx !== -1) {
          items[idx] = { ...items[idx], ...updateData };
          saveFileStorage(memoryDb);
          return items[idx];
        }
        return null;
      }
    },
    async deleteOne(query) {
      if (isMongoConnected) {
        return await model.deleteOne(query).exec();
      } else {
        const items = memoryDb[keyInStore] || [];
        const idx = items.findIndex(i => Object.entries(query).every(([k, v]) => i[k] === v));
        if (idx !== -1) {
          const removed = items.splice(idx, 1);
          saveFileStorage(memoryDb);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      }
    }
  };
}

export const db = {
  users: createCollectionAdapter(UserModel, 'users'),
  materials: createCollectionAdapter(MaterialModel, 'materials'),
  formulations: createCollectionAdapter(FormulationModel, 'formulations'),
  batches: createCollectionAdapter(BatchModel, 'batches'),
  deviations: createCollectionAdapter(DeviationModel, 'deviations'),
  auditLogs: createCollectionAdapter(AuditLogModel, 'auditLogs'),
  digitalSignatures: createCollectionAdapter(DigitalSignatureModel, 'digitalSignatures')
};

// Seed Realistic Demo Data into storage
async function seedDefaultData() {
  const seed = await generateInitialSeed();
  
  // Add sample realistic raw materials (1 expired, 1 quarantine, 2 released)
  const today = new Date();
  const pastDate = new Date(today.getTime() - 40 * 86400000).toISOString().split('T')[0]; // Expired 40 days ago
  const futureDate1 = new Date(today.getTime() + 500 * 86400000).toISOString().split('T')[0];
  const futureDate2 = new Date(today.getTime() + 720 * 86400000).toISOString().split('T')[0];

  const sampleMaterials = [
    {
      id: "MAT-PCM-API-01",
      materialCode: "API-PCM-01",
      name: "Paracetamol Active Pharmaceutical Ingredient (USP)",
      category: "API",
      lotNumber: "LOT-PCM-2025-089",
      vendor: "Novartis Chemicals Ltd",
      quantity: 250.0,
      allocatedQuantity: 50.0,
      unit: "kg",
      receivedDate: "2025-10-15",
      expiryDate: futureDate1,
      status: "RELEASED",
      coaNumber: "COA-NOV-88129",
      storageCondition: "Store below 25°C in a dry place",
      testedBy: "Dr. Elena Rostova",
      releasedBy: "Dr. Elena Rostova",
      releaseTimestamp: new Date().toISOString(),
      releaseSignature: "SIG-RELEASED-PCM-01",
      notes: "Passed USP Monograph assay & purity check. Cleared for production."
    },
    {
      id: "MAT-MCC-EXC-02",
      materialCode: "EXC-MCC-02",
      name: "Microcrystalline Cellulose PH-102",
      category: "Excipient",
      lotNumber: "LOT-MCC-2025-412",
      vendor: "FMC BioPolymer",
      quantity: 120.0,
      allocatedQuantity: 18.5,
      unit: "kg",
      receivedDate: "2025-11-01",
      expiryDate: futureDate2,
      status: "RELEASED",
      coaNumber: "COA-FMC-9901",
      storageCondition: "Controlled Room Temperature",
      testedBy: "Dr. Elena Rostova",
      releasedBy: "Dr. Elena Rostova",
      releaseTimestamp: new Date().toISOString(),
      releaseSignature: "SIG-RELEASED-MCC-02",
      notes: "Particle size distribution and loss on drying within specifications."
    },
    {
      id: "MAT-EXP-AMX-09",
      materialCode: "API-AMX-01",
      name: "Amoxicillin Trihydrate Micronized (EXPIRED DEMO)",
      category: "API",
      lotNumber: "LOT-AMX-2023-004",
      vendor: "DSM Sinochem Pharmaceuticals",
      quantity: 45.0,
      allocatedQuantity: 0.0,
      unit: "kg",
      receivedDate: "2023-01-10",
      expiryDate: pastDate,
      status: "REJECTED",
      coaNumber: "COA-DSM-2023-41",
      storageCondition: "Refrigerated 2-8°C",
      testedBy: "Dr. Elena Rostova",
      releasedBy: "Dr. Elena Rostova",
      releaseTimestamp: new Date().toISOString(),
      releaseSignature: "SIG-REJECTED-EXP-09",
      notes: "AUTOMATED EXpiry SYSTEM: Reached end of shelf life. Quarantine lock active, prohibited for production dispensing."
    },
    {
      id: "MAT-QUA-MGST-04",
      materialCode: "EXC-MGST-04",
      name: "Magnesium Stearate Lubricant (QUARANTINE DEMO)",
      category: "Excipient",
      lotNumber: "LOT-MGST-2026-901",
      vendor: "Peter Greven Pharma",
      quantity: 80.0,
      allocatedQuantity: 0.0,
      unit: "kg",
      receivedDate: new Date().toISOString().split('T')[0],
      expiryDate: futureDate2,
      status: "QUARANTINE",
      coaNumber: "COA-IN-MGST-901",
      storageCondition: "Store in cool dry place",
      testedBy: null,
      releasedBy: null,
      releaseTimestamp: null,
      releaseSignature: null,
      notes: "Newly received warehouse shipment. Awaiting laboratory microbial assay & heavy metals testing."
    }
  ];

  // Sample Batch
  const sampleBatches = [
    {
      id: "BATCH-PCM-2026-001",
      batchNumber: "BCH-2026-9841",
      formulationId: "FORM-PCM-500",
      drugName: "Paracetamol Extended Release",
      dosageForm: "Tablet",
      targetYield: 100000,
      plannedStartDate: new Date().toISOString().split('T')[0],
      actualStartDate: new Date().toISOString(),
      actualEndDate: null,
      status: "GRANULATION", // Active batch in Granulation stage
      previousStatus: "WEIGHING",
      activeDeviationHold: false,
      currentStageIndex: 1,
      allocatedLots: [
        { materialCode: "API-PCM-01", lotNumber: "LOT-PCM-2025-089", quantityAllocated: 50.0, unit: "kg" },
        { materialCode: "EXC-MCC-02", lotNumber: "LOT-MCC-2025-412", quantityAllocated: 18.5, unit: "kg" }
      ],
      stageExecutions: [
        {
          stageNumber: 1,
          stageName: "Dispensing & Raw Material Verification",
          status: "COMPLETED",
          operator: "Alex Mercer",
          startTime: new Date(Date.now() - 3600000 * 4).toISOString(),
          endTime: new Date(Date.now() - 3600000 * 2).toISOString(),
          recordedParams: [
            { name: "Cleanroom Temperature", recordedValue: 20.8, unit: "°C", isConforming: true },
            { name: "Cleanroom Relative Humidity", recordedValue: 44.5, unit: "% RH", isConforming: true },
            { name: "Dispensing Scale Calibration Check", recordedValue: 1, unit: "Status", isConforming: true }
          ],
          qaApproval: {
            approvedBy: "Dr. Elena Rostova",
            approvedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            signatureStamp: "SIG-QA-STEP1-PASS"
          }
        },
        {
          stageNumber: 2,
          stageName: "Granulation & Fluidized Bed Drying",
          status: "IN_PROGRESS",
          operator: "Alex Mercer",
          startTime: new Date(Date.now() - 3600000 * 1.5).toISOString(),
          endTime: null,
          recordedParams: [
            { name: "Impeller Speed", recordedValue: 352, unit: "RPM", isConforming: true },
            { name: "Inlet Air Temperature", recordedValue: 61.5, unit: "°C", isConforming: true },
            { name: "Exhaust Air Temperature", recordedValue: 42.0, unit: "°C", isConforming: true },
            { name: "Granule Loss on Drying (LOD)", recordedValue: 1.85, unit: "%", isConforming: true }
          ],
          qaApproval: null
        }
      ],
      labResults: [],
      qaApproval: null,
      genealogy: {
        rawMaterialLots: [
          { materialCode: "API-PCM-01", name: "Paracetamol Active Pharmaceutical Ingredient (USP)", lotNumber: "LOT-PCM-2025-089", vendor: "Novartis Chemicals Ltd" },
          { materialCode: "EXC-MCC-02", name: "Microcrystalline Cellulose PH-102", lotNumber: "LOT-MCC-2025-412", vendor: "FMC BioPolymer" }
        ],
        equipmentUsed: ["High-Precision Floor Scale FS-901", "Glatt Fluid Bed Dryer FBD-400"],
        cleanrooms: ["Cleanroom ISO-8 (Granulation Bay 3)"]
      },
      createdBy: { id: "USR-OP-01", name: "Alex Mercer", role: "OPERATOR" },
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ];

  return {
    users: seed.users,
    materials: sampleMaterials,
    formulations: seed.formulations,
    batches: sampleBatches,
    deviations: seed.deviations,
    auditLogs: seed.auditLogs,
    digitalSignatures: seed.digitalSignatures
  };
}

export const resetDatabaseFresh = async () => {
  const freshSeed = await seedDefaultData();
  if (isMongoConnected) {
    await UserModel.deleteMany({});
    await MaterialModel.deleteMany({});
    await FormulationModel.deleteMany({});
    await BatchModel.deleteMany({});
    await DeviationModel.deleteMany({});
    await AuditLogModel.deleteMany({});
    await DigitalSignatureModel.deleteMany({});

    await UserModel.insertMany(freshSeed.users);
    await MaterialModel.insertMany(freshSeed.materials);
    await FormulationModel.insertMany(freshSeed.formulations);
    await BatchModel.insertMany(freshSeed.batches);
    await DeviationModel.insertMany(freshSeed.deviations);
    await AuditLogModel.insertMany(freshSeed.auditLogs);
    await DigitalSignatureModel.insertMany(freshSeed.digitalSignatures);
  } else {
    memoryDb = freshSeed;
    saveFileStorage(memoryDb);
  }
  console.log('🔄 Database reset to clean fresh state with demo seed.');
  return freshSeed;
};

export const initDatabase = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri && mongoUri.startsWith('mongodb')) {
    try {
      const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      isMongoConnected = true;
      console.log(`✅ MERN MongoDB Atlas Connected: ${conn.connection.host}`);
      
      // Seed if empty
      const userCount = await UserModel.countDocuments();
      if (userCount === 0) {
        await resetDatabaseFresh();
      }
      return conn;
    } catch (error) {
      console.warn(`⚠️ MongoDB Connection Error (${error.message}). Falling back to persistent File Storage mode.`);
      isMongoConnected = false;
    }
  } else {
    console.log('ℹ️ MONGO_URI not configured. Operating in persistent File Storage mode.');
    isMongoConnected = false;
  }

  // File storage fallback
  let fileData = loadFileStorage();
  if (!fileData || !fileData.users || fileData.users.length === 0) {
    fileData = await seedDefaultData();
    saveFileStorage(fileData);
  }
  memoryDb = fileData;
  console.log('📂 Offline File Storage initialized with persistent JSON backend.');
};