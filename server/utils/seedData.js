import bcrypt from 'bcryptjs';
import { calculateAuditHash } from './cryptoHash.js';

export const initialFormulations = [
  {
    id: "FORM-PCM-500",
    drugCode: "PCM-500-TAB",
    drugName: "Paracetamol Extended Release",
    dosageForm: "Tablet",
    strength: "500 mg",
    targetBatchSize: 100000,
    unit: "Tablets",
    shelfLifeMonths: 36,
    storageCondition: "Store below 25°C in a dry place",
    bom: [
      { materialCode: "API-PCM-01", materialName: "Paracetamol Active Pharmaceutical Ingredient (USP)", requiredQty: 50.0, unit: "kg" },
      { materialCode: "EXC-MCC-02", materialName: "Microcrystalline Cellulose PH-102", requiredQty: 18.5, unit: "kg" },
      { materialCode: "EXC-PVP-03", materialName: "Povidone K-30 Binder", requiredQty: 3.2, unit: "kg" },
      { materialCode: "EXC-MGST-04", materialName: "Magnesium Stearate Lubricant", requiredQty: 0.8, unit: "kg" },
      { materialCode: "COAT-OPD-05", materialName: "Opadry White Film Coating Premix", requiredQty: 2.5, unit: "kg" }
    ],
    stages: [
      {
        stepNumber: 1,
        name: "Dispensing & Raw Material Verification",
        description: "Verify quarantine release stickers, scan lot barcodes, and dispense exact API and excipients inside Cleanroom ISO-8.",
        equipmentType: "High-Precision Floor Scale FS-901",
        standardParams: [
          { name: "Cleanroom Temperature", unit: "°C", target: 21.0, min: 18.0, max: 24.0 },
          { name: "Cleanroom Relative Humidity", unit: "% RH", target: 45.0, min: 35.0, max: 55.0 },
          { name: "Dispensing Scale Calibration Check", unit: "Status", target: 1, min: 1, max: 1 }
        ],
        qaSignOffRequired: true
      },
      {
        stepNumber: 2,
        name: "Granulation & Fluidized Bed Drying",
        description: "Dry-mix API and excipients, add binder solution, granulate in High Shear Mixer and dry to target Loss-On-Drying (LOD).",
        equipmentType: "Glatt Fluid Bed Dryer FBD-400",
        standardParams: [
          { name: "Impeller Speed", unit: "RPM", target: 350, min: 320, max: 380 },
          { name: "Inlet Air Temperature", unit: "°C", target: 62.0, min: 58.0, max: 66.0 },
          { name: "Exhaust Air Temperature", unit: "°C", target: 41.5, min: 38.0, max: 45.0 },
          { name: "Granule Loss on Drying (LOD)", unit: "%", target: 1.8, min: 1.2, max: 2.4 }
        ],
        qaSignOffRequired: true
      },
      {
        stepNumber: 3,
        name: "Compression / Tableting",
        description: "Compress blended granules into bi-convex tablets with target hardness, friability, and uniform thickness.",
        equipmentType: "Fette 3090 Rotary Tablet Press",
        standardParams: [
          { name: "Main Compression Force", unit: "kN", target: 18.5, min: 16.0, max: 22.0 },
          { name: "Turret Speed", unit: "RPM", target: 45, min: 40, max: 50 },
          { name: "Tablet Average Weight", unit: "mg", target: 750.0, min: 720.0, max: 780.0 },
          { name: "Tablet Hardness", unit: "kp", target: 12.0, min: 9.5, max: 14.5 }
        ],
        qaSignOffRequired: true
      },
      {
        stepNumber: 4,
        name: "Aqueous Film Coating",
        description: "Apply Opadry protective film coating in perforated pan coater with controlled spray rate and bed temperature.",
        equipmentType: "Thomas Engineering Accela-Cota 48",
        standardParams: [
          { name: "Tablet Bed Temperature", unit: "°C", target: 44.0, min: 41.0, max: 47.0 },
          { name: "Spray Rate", unit: "g/min", target: 165.0, min: 150.0, max: 180.0 },
          { name: "Atomization Air Pressure", unit: "bar", target: 2.8, min: 2.5, max: 3.2 },
          { name: "Weight Gain", unit: "%", target: 3.0, min: 2.6, max: 3.4 }
        ],
        qaSignOffRequired: true
      },
      {
        stepNumber: 5,
        name: "Primary Blister Packaging & Labeling",
        description: "Package coated tablets into Alu-Alu blister strips with automated vision inspection for missing tablets and lot code print.",
        equipmentType: "Uhlmann UPS-4 Blister Line",
        standardParams: [
          { name: "Sealing Temperature", unit: "°C", target: 155.0, min: 148.0, max: 162.0 },
          { name: "Forming Air Pressure", unit: "bar", target: 6.0, min: 5.5, max: 6.5 },
          { name: "Vision Camera Rejection Rate", unit: "%", target: 0.1, min: 0.0, max: 0.5 }
        ],
        qaSignOffRequired: true
      }
    ],
    specifications: {
      purityMin: 98.5,
      purityMax: 101.5,
      dissolutionMin: 85.0,
      phMin: 5.5,
      phMax: 6.5,
      microbialLimit: "Passes USP <61>/<62> (< 100 CFU/g)",
      hardnessMin: 9.0,
      hardnessMax: 15.0,
      friabilityMax: 0.5
    }
  },
  {
    id: "FORM-AMX-250",
    drugCode: "AMX-250-CAP",
    drugName: "Amoxicillin Trihydrate Capsules",
    dosageForm: "Capsule",
    strength: "250 mg",
    targetBatchSize: 80000,
    unit: "Capsules",
    shelfLifeMonths: 24,
    storageCondition: "Store below 20°C in airtight container",
    bom: [
      { materialCode: "API-AMX-01", materialName: "Amoxicillin Trihydrate Powder (USP)", requiredQty: 23.0, unit: "kg" },
      { materialCode: "EXC-MCC-02", materialName: "Microcrystalline Cellulose PH-102", requiredQty: 8.0, unit: "kg" },
      { materialCode: "EXC-MGST-04", materialName: "Magnesium Stearate Lubricant", requiredQty: 0.4, unit: "kg" }
    ],
    stages: [
      {
        stepNumber: 1,
        name: "Material Dispensing & Weighing",
        description: "Dispense micronized Amoxicillin API and excipients under laminar air flow cabinet.",
        equipmentType: "Mettler Toledo Scale MT-50",
        standardParams: [
          { name: "Room Humidity", unit: "% RH", target: 35.0, min: 25.0, max: 40.0 },
          { name: "Room Temperature", unit: "°C", target: 19.5, min: 17.0, max: 22.0 }
        ],
        qaSignOffRequired: true
      },
      {
        stepNumber: 2,
        name: "V-Cone Powder Blending",
        description: "Tumble blend powders to achieve blend uniformity (RSD < 3.0%).",
        equipmentType: "Paterson-Kelley V-Blender 150L",
        standardParams: [
          { name: "Blending Time", unit: "min", target: 25, min: 20, max: 30 },
          { name: "Rotation Speed", unit: "RPM", target: 22, min: 20, max: 24 }
        ],
        qaSignOffRequired: true
      },
      {
        stepNumber: 3,
        name: "Capsule Filling & Weight Sorting",
        description: "Fill hard gelatin Size 0 capsules with automated 100% checkweighing.",
        equipmentType: "Bosch GKF 1400 Capsule Filler",
        standardParams: [
          { name: "Filling Speed", unit: "caps/hr", target: 45000, min: 40000, max: 50000 },
          { name: "Average Fill Weight", unit: "mg", target: 390.0, min: 375.0, max: 405.0 }
        ],
        qaSignOffRequired: true
      }
    ],
    specifications: {
      purityMin: 99.0,
      purityMax: 102.0,
      dissolutionMin: 80.0,
      phMin: 4.8,
      phMax: 5.8,
      microbialLimit: "Passes USP <61>",
      hardnessMin: 0,
      hardnessMax: 0,
      friabilityMax: 0
    }
  }
];

export async function generateInitialSeed(isCleanSlate = true) {
  const salt = await bcrypt.genSalt(10);
  
  // Dedicated Separate Passwords for Each Role
  const operatorPasswordHash = await bcrypt.hash("operator123", salt);
  const managerPasswordHash = await bcrypt.hash("manager123", salt);
  const auditorPasswordHash = await bcrypt.hash("auditor123", salt);
  const adminPasswordHash = await bcrypt.hash("admin123", salt);
  const defaultPinHash = await bcrypt.hash("1234", salt);

  const users = [
    {
      id: "USR-OP-01",
      username: "operator",
      fullName: "Alex Mercer",
      email: "operator@pharmatrace.com",
      role: "OPERATOR",
      department: "Production Floor",
      employeeId: "EMP-9042",
      passwordHash: operatorPasswordHash,
      pinHash: defaultPinHash,
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "USR-QA-01",
      username: "manager",
      fullName: "Dr. Elena Rostova",
      email: "manager@pharmatrace.com",
      role: "QA_QC_MANAGER",
      department: "Quality Assurance",
      employeeId: "EMP-4108",
      passwordHash: managerPasswordHash,
      pinHash: defaultPinHash,
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "USR-AUD-01",
      username: "auditor",
      fullName: "David Vance",
      email: "auditor@fda.gov",
      role: "AUDITOR",
      department: "Compliance Audit",
      employeeId: "AUD-7721",
      passwordHash: auditorPasswordHash,
      pinHash: defaultPinHash,
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "USR-ADM-01",
      username: "admin",
      fullName: "Sarah Chen",
      email: "admin@pharmatrace.com",
      role: "ADMIN",
      department: "IT Systems",
      employeeId: "EMP-1001",
      passwordHash: adminPasswordHash,
      pinHash: defaultPinHash,
      active: true,
      createdAt: new Date().toISOString()
    }
  ];

  // Genesis audit log block
  const genesisEvent = {
    timestamp: new Date().toISOString(),
    userId: "USR-ADM-01",
    username: "System Initialization",
    userRole: "ADMIN",
    ipAddress: "127.0.0.1",
    action: "SYSTEM_INITIALIZED",
    resourceType: "SYSTEM",
    resourceId: "PHARMA-GENESIS",
    details: "PharmaTrace system initialized with clean MongoDB state.",
    fieldChanged: "SYSTEM_STATE",
    oldValue: "UNINITIALIZED",
    newValue: "ACTIVE",
    digitalSignature: ""
  };

  const prevHash = "GENESIS_BLOCK_HASH_PHARMATRACE_2026";
  const hash = calculateAuditHash(genesisEvent, prevHash);

  const auditLogs = [
    {
      id: "AUD-LOG-GENESIS",
      eventId: "EV-0001",
      ...genesisEvent,
      prevHash,
      hash
    }
  ];

  return {
    users,
    materials: [],
    formulations: initialFormulations,
    batches: [],
    deviations: [],
    auditLogs,
    digitalSignatures: []
  };
}
