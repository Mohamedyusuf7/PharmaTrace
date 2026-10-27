# AegisPharma™ EBR & MES Platform
### FDA 21 CFR Part 11 Electronic Batch Record & Manufacturing Execution System (MERN Stack)

AegisPharma™ is a pharmaceutical-grade **Manufacturing Execution System (MES)** and **Electronic Batch Record (EBR)** application designed for life-sciences and pharmaceutical manufacturing cleanrooms. It strictly enforces compliance with **US FDA 21 CFR Part 11**, EU Annex 11, and current Good Manufacturing Practice (cGMP).

---

## 🌟 Key Features & Compliance Modules

### 1. Authentication & Role-Based Access Control (RBAC)
- **Granular Plant Roles**:
  - **Production Operator**: Weighs and dispenses raw materials, logs critical process parameters (CPPs), executes stage checklists.
  - **QA/QC Manager**: Evaluates analytical monograph assays, releases/rejects quarantine chemicals, signs off stage completions, and authorizes final batch release.
  - **External FDA Auditor**: Dedicated portal to inspect historical records, verify cryptographic hash chains, and export compliance reports.
  - **System Admin**: Manages personnel accounts, assigns RBAC roles, provisions master drug recipes, and configures plant parameters.
- **21 CFR Part 11 § 11.50 / § 11.200 Digital Signatures**: Critical regulatory actions (stage sign-off, quarantine disposition, CAPA resolution, batch release) mandate re-authenticating user credentials (PIN/password) with legal attestation and SHA-256 HMAC cryptographic stamp.

### 2. Raw Material & Quarantine Management
- **Inbound Chemical Shipment Intake**: Warehouse logging of active pharmaceutical ingredients (APIs), excipients, and packaging materials.
- **Automatic Quarantine Interlock**: All incoming materials automatically default to `QUARANTINE`. Manufacturing floor operators are strictly blocked from dispensing unapproved materials.
- **Expiry & Barcode Tracking**: Materials are assigned unique digital QR codes and barcodes. Expired lots are dynamically locked from active batches.

### 3. Electronic Batch Record (EBR) Execution Engine
- **Drug Master Formulations**: Master recipes (Paracetamol 500mg, Amoxicillin 250mg) with bill of materials (BOM), standard operating procedures (SOPs), and validated tolerance windows.
- **Step-by-Step Execution Stepper**: Guides operators sequentially through:
  1. Dispensing & Raw Material Verification
  2. Granulation & Fluidized Bed Drying
  3. Compression / Tableting
  4. Aqueous Film Coating
  5. Primary Blister Packaging & Labeling
- **Automated Stage Interlocks & Locks**: Once an operator marks a stage complete, progress locks. The next stage remains disabled until a QA/QC Manager reviews parameters and provides a 21 CFR Part 11 digital signature.

### 4. Quality Inspection & Approvals (QC Lab)
- **Analytical Monograph Assays**: QC Analysts record HPLC purity assay (%), dissolution rate (%), pH level, tablet hardness, and microbial bioburden.
- **Automated Out-of-Specification (OOS) Detection**: Automatically validates entered values against master formulation tolerances. If a parameter falls out of specification, the batch is instantly placed on **QA HOLD** and an automated Deviation ticket is created.
- **Final Batch Release Cockpit**: Enforces all stages completed, zero unresolved deviations, and conforming lab tests before generating the official Certificate of Analysis (COA).

### 5. Deviation Management & CAPA Hub
- **Instant Batch Hold Locks**: Logging an unexpected event (equipment overheating, humidity excursion, power disruption) immediately freezes the impacted batch across manufacturing lines.
- **Corrective & Preventive Actions (CAPA)**: Root cause investigation, mandatory action items, assigned owners, target due dates, and resolution verification.
- **QA Sign-off & Hold Release**: Resolving a deviation with digital signature automatically lifts the batch freeze lock.

### 6. 21 CFR Part 11 Audit Trail & Cryptographic Engine
- **Automated Database Interceptor**: Express middleware intercepts all mutations (create, update, delete) and logs before/after diffs, actor identity, role, timestamp, and client IP.
- **SHA-256 Blockchain-Style Hash Chaining**: Every log entry is cryptographically linked to the previous block's hash.
- **Cryptographic Audit Integrity Verifier**: 1-click verification that recalculates hashes from the Genesis block to current block to mathematically prove zero record tampering.
- **PDF & CSV Export**: Export compliance-ready audit trails and printable Electronic Batch Records.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)

### 1. Install & Start Backend
```bash
cd server
npm install
npm start
# Backend runs on http://localhost:5000
```

### 2. Install & Start Frontend
```bash
cd client
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 👥 Demo Pre-Provisioned Accounts

| Role | Username | Full Name | Security PIN | Default Password |
| :--- | :--- | :--- | :---: | :---: |
| **QA / QC Manager** | `qa_dr_elena` | Dr. Elena Rostova | `1234` | `Pharma@2026` |
| **Production Operator** | `operator_alex` | Alex Mercer | `1234` | `Pharma@2026` |
| **External FDA Auditor** | `auditor_david` | David Vance, RAC | `1234` | `Pharma@2026` |
| **System Admin** | `admin_sarah` | Sarah Chen | `1234` | `Pharma@2026` |

*💡 Tip: Use the **1-Click Demo Role Switcher** in the top navigation bar to seamlessly test all 4 permission levels in real time.*
