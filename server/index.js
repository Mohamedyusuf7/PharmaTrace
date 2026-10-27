import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initDatabase } from './config/db.js';
import { auditInterceptor } from './middleware/auditLogger.js';

// Route Imports
import authRoutes from './routes/auth.js';
import materialRoutes from './routes/materials.js';
import formulationRoutes from './routes/formulations.js';
import batchRoutes from './routes/batches.js';
import qcRoutes from './routes/qc.js';
import deviationRoutes from './routes/deviations.js';
import auditRoutes from './routes/audit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Automated 21 CFR Part 11 Audit Trail Interceptor
app.use(auditInterceptor);

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/formulations', formulationRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/deviations', deviationRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'AegisPharma 21 CFR Part 11 MES & EBR System',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start Server
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`🛡️  AEGISPHARMA™ 21 CFR PART 11 MES & EBR BACKEND RUNNING`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔐 RBAC & Cryptographic Audit Ledger Activated`);
    console.log(`================================================================\n`);
  });
}

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
