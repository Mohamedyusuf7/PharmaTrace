import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Boxes,
  ClipboardList,
  CheckSquare,
  History,
  Plus,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';

const SIMPLE_DEFAULT_MATERIALS = [
  { id: "M1", name: "Paracetamol Active Powder", lotNumber: "LOT-PCM-2025", expiryDate: "2028-05-15", status: "SAFE", quantity: "250 kg" },
  { id: "M2", name: "Microcrystalline Cellulose", lotNumber: "LOT-MCC-2025", expiryDate: "2027-12-01", status: "SAFE", quantity: "120 kg" },
  { id: "M3", name: "Magnesium Stearate", lotNumber: "LOT-MGST-2026", expiryDate: "2027-08-20", status: "QUARANTINE", quantity: "80 kg" },
  { id: "M4", name: "Amoxicillin Powder", lotNumber: "LOT-AMX-2023", expiryDate: "2025-01-10", status: "EXPIRED", quantity: "45 kg" }
];

const SIMPLE_DEFAULT_BATCHES = [
  { id: "B1", batchNumber: "BCH-2026-001", drugName: "Paracetamol 500mg Tablets", stage: "Granulation & Drying", status: "IN_PROGRESS", rawMaterial: "Paracetamol Lot #LOT-PCM-2025" },
  { id: "B2", batchNumber: "BCH-2026-002", drugName: "Amoxicillin 250mg Capsules", stage: "Weighing & Dispensing", status: "PENDING_APPROVAL", rawMaterial: "Microcrystalline Lot #LOT-MCC-2025" }
];

export function Dashboard() {
  const { user, isOperator, isQAManager, isAuditor, isAdmin } = useAuth();
  const [materials, setMaterials] = useState(SIMPLE_DEFAULT_MATERIALS);
  const [batches, setBatches] = useState(SIMPLE_DEFAULT_BATCHES);
  const [loading, setLoading] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [mRes, bRes] = await Promise.all([api.getMaterials(), api.getBatches()]);
      if (mRes.success && mRes.materials) setMaterials(mRes.materials);
      if (bRes.success && bRes.batches) setBatches(bRes.batches);
    } catch (err) {
      console.log('Error loading dashboard data from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const safeCount = materials.filter(m => m.status === 'SAFE' || m.status === 'RELEASED').length;
  const quarantineCount = materials.filter(m => m.status === 'QUARANTINE').length;
  const expiredCount = materials.filter(m => m.status === 'EXPIRED' || m.status === 'REJECTED' || m.isExpired).length;
  const pendingApprovalsCount = batches.filter(b => b.status === 'PENDING_APPROVAL' || b.status === 'HOLD' || b.activeDeviationHold).length + quarantineCount;

  return (
    <div className="main-content">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>Pharma Management Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Traceability for raw materials, batch manufacturing records, quality approvals, and audit history.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadDashboardData}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          {(isOperator || isAdmin) && (
            <Link to="/execution" className="btn btn-primary">
              <Plus size={16} /> New Batch
            </Link>
          )}
          {isQAManager && (
            <Link to="/deviations" className="btn btn-emerald">
              <CheckSquare size={16} /> Manager Approvals ({pendingApprovalsCount})
            </Link>
          )}
          {isAuditor && (
            <Link to="/auditor" className="btn btn-secondary">
              <History size={16} /> Audit Trail
            </Link>
          )}
        </div>
      </div>

      {/* 4 Clean Summary Cards */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Safe Raw Materials</span>
            <Boxes size={18} color="#047857" />
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857' }}>{safeCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Cleared for production</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Batches</span>
            <ClipboardList size={18} color="#0284c7" />
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7' }}>{batches.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>In manufacturing pipeline</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Approvals</span>
            <CheckSquare size={18} color="#b45309" />
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309' }}>{pendingApprovalsCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Requires Manager PIN approval</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Expired / Locked</span>
            <AlertTriangle size={18} color="#dc2626" />
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>{expiredCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Prohibited from production</div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid-2">
        {/* Table 1: Raw Materials */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Raw Material Inventory</h2>
            <Link to="/materials" style={{ color: '#0284c7', fontSize: '0.825rem', fontWeight: 700, textDecoration: 'none' }}>
              View All Raw Materials &rarr;
            </Link>
          </div>

          <table className="table-light">
            <thead>
              <tr>
                <th>Material Name</th>
                <th>Lot Number</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td><strong style={{ color: '#0f172a' }}>{m.name}</strong></td>
                  <td><span className="mono" style={{ color: '#0284c7', fontWeight: 700 }}>#{m.lotNumber}</span></td>
                  <td>{m.expiryDate}</td>
                  <td>
                    {m.status === 'SAFE' || m.status === 'RELEASED' ? (
                      <span className="badge badge-emerald">SAFE</span>
                    ) : m.status === 'QUARANTINE' ? (
                      <span className="badge badge-amber">QUARANTINE</span>
                    ) : (
                      <span className="badge badge-rose">EXPIRED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table 2: Production Batches */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Production Batches</h2>
            <Link to="/execution" style={{ color: '#0284c7', fontSize: '0.825rem', fontWeight: 700, textDecoration: 'none' }}>
              Manage Production &rarr;
            </Link>
          </div>

          <table className="table-light">
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Drug Product</th>
                <th>Current Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td><span className="mono" style={{ color: '#0284c7', fontWeight: 700 }}>#{b.batchNumber}</span></td>
                  <td><strong style={{ color: '#0f172a' }}>{b.drugName}</strong></td>
                  <td>{b.stage || b.status}</td>
                  <td>
                    {b.status === 'PENDING_APPROVAL' || b.status === 'HOLD' || b.activeDeviationHold ? (
                      <span className="badge badge-amber">NEEDS APPROVAL</span>
                    ) : (
                      <span className="badge badge-emerald">IN PRODUCTION</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
