import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DigitalSignatureModal } from '../components/DigitalSignatureModal';
import {
  AlertTriangle,
  Plus,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  UserCheck,
  Calendar,
  FileText,
  RefreshCw
} from 'lucide-react';

// Static Fallback Data for instant display
const STATIC_DEVIATIONS = [
  {
    id: "DEV-2026-001",
    deviationNumber: "DEV-2026-104",
    title: "Cleanroom Humidity Excursion During Granulation",
    batchId: "BATCH-PCM-2026-001",
    batchNumber: "BCH-2026-9841",
    stageNumber: 2,
    stageName: "Granulation & Fluidized Bed Drying",
    severity: "MAJOR",
    description: "Relative humidity in Cleanroom ISO-8 briefly rose to 58.2% RH (standard max limit: 55.0% RH) for 14 minutes due to air filter maintenance.",
    immediateActionTaken: "Granulation process paused. Air handling unit recalibrated and humidity stabilized back to 44.5% RH.",
    loggedBy: { id: "USR-OP-01", name: "Alex Mercer", role: "OPERATOR" },
    status: "OPEN",
    capa: {
      actionPlan: "Inspect HVAC dehumidifier unit, test granule moisture content (LOD), and re-verify product stability.",
      rootCause: "HVAC intake valve temporary calibration drift",
      assignedTo: "Dr. Elena Rostova (QA Manager)",
      dueDate: "2026-10-05",
      completedAt: null,
      resolutionNotes: null,
      verifiedBy: null
    },
    holdPlaced: true,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    resolvedAt: null
  },
  {
    id: "DEV-2026-002",
    deviationNumber: "DEV-2026-098",
    title: "Weight Variation Minor Drift in Blister Line",
    batchId: "BATCH-AMX-2026-002",
    batchNumber: "BCH-2026-4412",
    stageNumber: 5,
    stageName: "Primary Blister Packaging",
    severity: "MINOR",
    description: "Camera vision sensor flagged 3 empty blister pockets out of 10,000 units. System automatically rejected affected blister strips.",
    immediateActionTaken: "Automatic rejection gate cleared strips. No defective packages reached final carton box.",
    loggedBy: { id: "USR-OP-01", name: "Alex Mercer", role: "OPERATOR" },
    status: "RESOLVED",
    capa: {
      actionPlan: "Clean optical lens on vision camera and re-align feeder tray.",
      rootCause: "Dust buildup on camera lens",
      assignedTo: "Lead Maintenance Eng. Mark Taylor",
      dueDate: "2026-09-28",
      completedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      resolutionNotes: "Camera cleaned and recalibrated with 100% check-weights. Verified by QA.",
      verifiedBy: { name: "Dr. Elena Rostova", signature: "SIG-QA-VERIFIED-098" }
    },
    holdPlaced: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    resolvedAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

const STATIC_BATCHES = [
  { id: "BATCH-PCM-2026-001", batchNumber: "BCH-2026-9841", drugName: "Paracetamol Extended Release 500mg", status: "HOLD" },
  { id: "BATCH-AMX-2026-002", batchNumber: "BCH-2026-4412", drugName: "Amoxicillin Trihydrate Capsules 250mg", status: "GRANULATION" }
];

export function Deviations() {
  const { user, isQAManager } = useAuth();
  const [searchParams] = useSearchParams();
  const [deviations, setDeviations] = useState(STATIC_DEVIATIONS);
  const [batches, setBatches] = useState(STATIC_BATCHES);
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Log Incident Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    batchId: searchParams.get('batchId') || STATIC_BATCHES[0].id,
    stageNumber: parseInt(searchParams.get('stage')) || 1,
    stageName: searchParams.get('stageName') || 'Manufacturing Line',
    title: '',
    severity: 'MAJOR',
    description: '',
    immediateActionTaken: 'Line temporarily paused and quarantined.',
    placeHold: true
  });

  // CAPA Plan Edit Modal State
  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState(null);
  const [capaForm, setCapaForm] = useState({
    rootCause: '',
    actionPlan: '',
    assignedTo: '',
    dueDate: ''
  });

  // Resolution Digital Signature Modal State
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dRes, bRes] = await Promise.all([
        api.getDeviations({ severity: severityFilter, status: statusFilter }),
        api.getBatches()
      ]);

      if (dRes.success && dRes.deviations) {
        setDeviations(dRes.deviations);
      }

      if (bRes.success && bRes.batches) {
        setBatches(bRes.batches);
        if (!logForm.batchId && bRes.batches.length > 0) {
          setLogForm(prev => ({ ...prev, batchId: bRes.batches[0].id || bRes.batches[0]._id }));
        }
      }
    } catch (err) {
      console.error('API load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [severityFilter, statusFilter]);

  const handleLogIncident = async (e) => {
    e.preventDefault();
    try {
      const res = await api.logDeviation(logForm);
      if (res.success && res.deviation) {
        setIsLogModalOpen(false);
        await fetchData();
        alert(`Success! Issue #${res.deviation.deviationNumber} saved to MongoDB Atlas!`);
      }
    } catch (err) {
      alert('Failed to save issue: ' + err.message);
    }
  };

  const handleSaveCapaPlan = async (e) => {
    e.preventDefault();
    try {
      await api.updateCapa(selectedDeviation.id || selectedDeviation._id, capaForm);
      setIsCapaModalOpen(false);
      await fetchData();
      alert(`Action plan saved to MongoDB Atlas!`);
    } catch (err) {
      alert('Failed to update action plan: ' + err.message);
    }
  };

  const handleConfirmResolution = async ({ pin, password, reason }) => {
    try {
      await api.resolveDeviation(selectedDeviation.id || selectedDeviation._id, {
        signaturePin: pin,
        signaturePassword: password,
        signatureReason: reason,
        resolutionNotes: 'Quality Manager reviewed action plan and approved batch release.',
        targetType: 'DEVIATION_RESOLVE',
        targetId: selectedDeviation.id || selectedDeviation._id
      });
      setIsSignatureOpen(false);
      await fetchData();
      alert(`Success! Issue resolved and saved to MongoDB Atlas! Batch hold lifted.`);
    } catch (err) {
      alert('Signature verification failed: ' + err.message);
    }
  };

  const openIncidentsCount = deviations.filter(d => d.status === 'OPEN' || d.status === 'CAPA_ASSIGNED').length;
  const activeHoldsCount = deviations.filter(d => d.holdPlaced).length;
  const criticalCount = deviations.filter(d => d.severity === 'CRITICAL').length;
  const resolvedCount = deviations.filter(d => d.status === 'RESOLVED').length;

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Issues & Manager Approvals</h1>
            <span className="badge badge-amber">Quality Control Center</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Log production issues, pause batches on hold, record action plans, and complete manager approvals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchData}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-danger" onClick={() => setIsLogModalOpen(true)}>
            <Plus size={16} />
            <span>Report New Issue</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Open Issues
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: openIncidentsCount > 0 ? '#b91c1c' : '#047857' }}>
            {openIncidentsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Pending manager review
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Batches On Hold
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: activeHoldsCount > 0 ? '#b45309' : '#047857' }}>
            {activeHoldsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Production paused
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            High Priority Issues
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: criticalCount > 0 ? '#b91c1c' : '#047857' }}>
            {criticalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Critical severity alerts
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Resolved & Approved
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857' }}>
            {resolvedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Signed off by Manager
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
          <Filter size={16} />
          <span>Filters:</span>
        </div>

        <select
          className="form-select"
          style={{ width: '180px', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical Priority</option>
          <option value="MAJOR">Major Priority</option>
          <option value="MINOR">Minor Priority</option>
        </select>

        <select
          className="form-select"
          style={{ width: '180px', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="CAPA_ASSIGNED">In Progress</option>
          <option value="RESOLVED">Resolved & Approved</option>
        </select>
      </div>

      {/* Issues List Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {deviations.map((dev) => (
          <div key={dev.id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: dev.holdPlaced ? '5px solid #dc2626' : '5px solid #059669' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7' }}>#{dev.deviationNumber}</span>
                  <span className={`badge ${dev.severity === 'CRITICAL' || dev.severity === 'MAJOR' ? 'badge-rose' : 'badge-amber'}`}>
                    {dev.severity} PRIORITY
                  </span>
                  {dev.holdPlaced ? (
                    <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Lock size={12} /> BATCH ON HOLD
                    </span>
                  ) : (
                    <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Unlock size={12} /> BATCH RELEASED
                    </span>
                  )}
                  <span className="badge badge-slate">{dev.status.replace('_', ' ')}</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{dev.title}</h3>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Batch Ref: <strong>#{dev.batchNumber}</strong> &bull; Stage #{dev.stageNumber}: {dev.stageName}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedDeviation(dev);
                    setCapaForm({
                      rootCause: dev.capa?.rootCause || '',
                      actionPlan: dev.capa?.actionPlan || '',
                      assignedTo: dev.capa?.assignedTo || '',
                      dueDate: dev.capa?.dueDate || ''
                    });
                    setIsCapaModalOpen(true);
                  }}
                >
                  <FileText size={14} />
                  <span>{dev.capa?.actionPlan ? 'Edit Action Plan' : 'Add Action Plan'}</span>
                </button>

                {dev.status !== 'RESOLVED' && (
                  <button
                    className="btn btn-emerald btn-sm"
                    onClick={() => {
                      setSelectedDeviation(dev);
                      setIsSignatureOpen(true);
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>Manager Sign-off & Release Hold</span>
                  </button>
                )}
              </div>
            </div>

            {/* Description & Action details */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                <strong>Issue Description:</strong> {dev.description}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#047857' }}>
                <strong>Immediate Action Taken:</strong> {dev.immediateActionTaken}
              </div>
            </div>

            {/* Assigned Action Plan Box */}
            {dev.capa && (dev.capa.actionPlan || dev.capa.assignedTo) && (
              <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd', fontSize: '0.825rem' }}>
                <div style={{ fontWeight: 800, color: '#0369a1', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <UserCheck size={15} />
                  <span>Corrective Action Plan</span>
                </div>
                <div style={{ color: '#0f172a' }}><strong>Plan:</strong> {dev.capa.actionPlan || 'Under investigation'}</div>
                <div style={{ color: '#475569', marginTop: '0.2rem' }}>
                  Assigned Person: <strong>{dev.capa.assignedTo || 'QA Team'}</strong> &bull; Target Date: <strong>{dev.capa.dueDate || 'N/A'}</strong>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Report New Issue Modal */}
      {isLogModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Report Production Issue</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsLogModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleLogIncident}>
              <div className="form-group">
                <label className="form-label">Select Production Batch</label>
                <select
                  className="form-select"
                  value={logForm.batchId}
                  onChange={(e) => setLogForm({ ...logForm, batchId: e.target.value })}
                  required
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>Batch #{b.batchNumber} - {b.drugName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Issue Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Temperature variation in drying stage"
                  value={logForm.title}
                  onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Priority Severity</label>
                  <select
                    className="form-select"
                    value={logForm.severity}
                    onChange={(e) => setLogForm({ ...logForm, severity: e.target.value })}
                  >
                    <option value="MINOR">Minor Priority</option>
                    <option value="MAJOR">Major Priority</option>
                    <option value="CRITICAL">Critical Priority</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Production Stage Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={logForm.stageName}
                    onChange={(e) => setLogForm({ ...logForm, stageName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Detailed Description of What Happened</label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe the issue, reading values, and any observation..."
                  value={logForm.description}
                  onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Immediate Action Taken on Floor</label>
                <input
                  type="text"
                  className="form-input"
                  value={logForm.immediateActionTaken}
                  onChange={(e) => setLogForm({ ...logForm, immediateActionTaken: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '1rem 0' }}>
                <input
                  type="checkbox"
                  id="placeHoldCheck"
                  checked={logForm.placeHold}
                  onChange={(e) => setLogForm({ ...logForm, placeHold: e.target.checked })}
                />
                <label htmlFor="placeHoldCheck" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#b91c1c' }}>
                  Pause Batch on QA Hold (Recommended for safety)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsLogModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Submit Issue Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit CAPA Modal */}
      {isCapaModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>
              Assign Action Plan for #{selectedDeviation?.deviationNumber}
            </h2>

            <form onSubmit={handleSaveCapaPlan}>
              <div className="form-group">
                <label className="form-label">Root Cause Analysis</label>
                <textarea
                  className="form-textarea"
                  placeholder="Identify what caused the issue..."
                  value={capaForm.rootCause}
                  onChange={(e) => setCapaForm({ ...capaForm, rootCause: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Corrective & Preventive Action Plan</label>
                <textarea
                  className="form-textarea"
                  placeholder="Steps to resolve and prevent recurrence..."
                  value={capaForm.actionPlan}
                  onChange={(e) => setCapaForm({ ...capaForm, actionPlan: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Assigned Person / Engineer</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Lead Engineer John Smith"
                    value={capaForm.assignedTo}
                    onChange={(e) => setCapaForm({ ...capaForm, assignedTo: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Completion Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={capaForm.dueDate}
                    onChange={(e) => setCapaForm({ ...capaForm, dueDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCapaModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Action Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Sign-off Modal */}
      {isSignatureOpen && (
        <DigitalSignatureModal
          isOpen={isSignatureOpen}
          onClose={() => setIsSignatureOpen(false)}
          onConfirm={handleConfirmResolution}
          title={`Manager Approval & Release Hold for #${selectedDeviation?.deviationNumber}`}
          actionDescription={`Confirm resolution of "${selectedDeviation?.title}" and lift batch hold for #${selectedDeviation?.batchNumber}.`}
        />
      )}
    </div>
  );
}
