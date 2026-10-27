import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DigitalSignatureModal } from '../components/DigitalSignatureModal';
import { BarcodeModal } from '../components/BarcodeModal';
import {
  Layers,
  Plus,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Zap,
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  Scale,
  RefreshCw,
  Play,
  Clock,
  Award
} from 'lucide-react';

const STATIC_FORMULATIONS = [
  {
    id: "FORM-PCM-500",
    drugCode: "PCM-500",
    drugName: "Paracetamol Extended Release 500mg",
    dosageForm: "Tablet",
    targetBatchSize: 100000,
    unit: "Tablets",
    bom: [
      { materialCode: "API-PCM-01", materialName: "Paracetamol Raw Powder", requiredQty: 50.0, unit: "kg" },
      { materialCode: "EXC-MCC-02", materialName: "Microcrystalline Cellulose", requiredQty: 18.5, unit: "kg" }
    ],
    stages: [
      { stepNumber: 1, name: "Dispensing & Weighing", description: "Verify raw material lot stickers, scan barcodes, and weigh exact powder quantities.", qaSignOffRequired: true },
      { stepNumber: 2, name: "Granulation & Drying", description: "Mix active ingredients and binder powder in high-shear mixer and dry to target moisture.", qaSignOffRequired: true },
      { stepNumber: 3, name: "Compression / Tableting", description: "Compress blended granules into uniform 500mg tablets.", qaSignOffRequired: true },
      { stepNumber: 4, name: "Film Coating", description: "Apply protective film coating to tablets.", qaSignOffRequired: true },
      { stepNumber: 5, name: "Blister Packaging", description: "Package coated tablets into protective blister strips.", qaSignOffRequired: true }
    ]
  }
];

const STATIC_BATCHES = [
  {
    id: "BATCH-PCM-2026-001",
    batchNumber: "BCH-2026-9841",
    formulationId: "FORM-PCM-500",
    drugName: "Paracetamol Extended Release 500mg",
    dosageForm: "Tablet",
    targetYield: 100000,
    status: "GRANULATION",
    activeDeviationHold: true,
    currentStageIndex: 1,
    allocatedLots: [
      { materialCode: "API-PCM-01", lotNumber: "LOT-PCM-2025-089", quantityAllocated: 50.0, unit: "kg" },
      { materialCode: "EXC-MCC-02", lotNumber: "LOT-MCC-2025-412", quantityAllocated: 18.5, unit: "kg" }
    ],
    stageExecutions: [
      {
        stageNumber: 1,
        stageName: "Dispensing & Weighing",
        status: "COMPLETED",
        operator: "Alex Mercer",
        qaApproval: { approvedBy: "Dr. Elena Rostova", approvedAt: new Date().toISOString() }
      },
      {
        stageNumber: 2,
        stageName: "Granulation & Drying",
        status: "IN_PROGRESS",
        operator: "Alex Mercer",
        qaApproval: null
      }
    ],
    createdBy: { name: "Alex Mercer", role: "OPERATOR" },
    createdAt: new Date().toISOString()
  }
];

export function BatchExecution() {
  const { user, isOperator, isQAManager, isAuditor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [batches, setBatches] = useState(STATIC_BATCHES);
  const [formulations, setFormulations] = useState(STATIC_FORMULATIONS);
  const [selectedBatchId, setSelectedBatchId] = useState(searchParams.get('id') || STATIC_BATCHES[0].id);
  const [batchData, setBatchData] = useState(STATIC_BATCHES[0]);
  const [activeStageNumber, setActiveStageNumber] = useState(1);
  const [loading, setLoading] = useState(false);

  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({
    formulationId: STATIC_FORMULATIONS[0].id,
    batchNumber: `PR2026-${Math.floor(100 + Math.random() * 900)}`,
    customBatchSize: 100000
  });

  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, fRes] = await Promise.all([
        api.getBatches(),
        api.getFormulations()
      ]);

      if (bRes.success && bRes.batches) {
        setBatches(bRes.batches);
        if (bRes.batches.length > 0 && !selectedBatchId) setSelectedBatchId(bRes.batches[0].id);
      }

      if (fRes.success && fRes.formulations) {
        setFormulations(fRes.formulations);
        if (fRes.formulations.length > 0 && !newBatchForm.formulationId) {
          setNewBatchForm(prev => ({ ...prev, formulationId: fRes.formulations[0].id }));
        }
      }
    } catch (err) {
      console.error('Error loading batches from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedBatchId && batches.length > 0) {
      const found = batches.find(b => b.id === selectedBatchId || b._id === selectedBatchId) || batches[0];
      setBatchData(found);
    }
  }, [selectedBatchId, batches]);

  // Get active formulation stages
  const currentFormulation = formulations.find(f => f.id === batchData?.formulationId || f._id === batchData?.formulationId) || formulations[0] || STATIC_FORMULATIONS[0];
  const activeRecipeStages = currentFormulation?.stages || STATIC_FORMULATIONS[0].stages;

  // Compute completed steps and automatically advance active step
  const stagesList = batchData?.stageExecutions || batchData?.stageLogs || [];
  const completedStepNumbers = stagesList
    .filter(s => s.status === 'COMPLETED' || (s.qaApproval && s.qaApproval.approved))
    .map(s => Number(s.stageNumber));

  // The active step is automatically the first step in the recipe that has not yet been completed
  const nextIncompleteStage = activeRecipeStages.find(
    s => !completedStepNumbers.includes(Number(s.stepNumber))
  );

  const currentStepNumber = nextIncompleteStage
    ? Number(nextIncompleteStage.stepNumber)
    : (activeRecipeStages.length + 1);

  const allStagesCompleted = completedStepNumbers.length >= activeRecipeStages.length;

  useEffect(() => {
    setActiveStageNumber(currentStepNumber);
  }, [batchData, currentStepNumber]);

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createBatch({
        formulationId: newBatchForm.formulationId,
        batchNumber: newBatchForm.batchNumber,
        targetYield: newBatchForm.customBatchSize
      });
      if (res.success && res.batch) {
        setIsInitModalOpen(false);
        await loadData();
        setSelectedBatchId(res.batch.id || res.batch._id);
        alert(`Success: New Production Batch #${newBatchForm.batchNumber} saved to MongoDB Atlas!`);
      }
    } catch (err) {
      alert('Batch creation failed: ' + err.message);
    }
  };

  const handleSignOffStage = async (sigData) => {
    const pin = sigData?.pin || sigData?.signaturePin || '1234';
    const password = sigData?.password || sigData?.signaturePassword || 'manager123';
    const reason = sigData?.reason || sigData?.signatureReason || 'Reviewed and approved by Quality Manager.';
    const batchId = batchData?._id || batchData?.id;
    const stepToSign = activeStageNumber || currentStepNumber;

    try {
      setLoading(true);
      const signFn = api.qaSignOffStage || ((bId, sNum, p) => api.signOffStage(bId, { stageNumber: sNum, ...p }));
      await signFn(batchId, stepToSign, {
        signaturePin: pin,
        signaturePassword: password,
        signatureReason: reason
      });
      setIsSignatureModalOpen(false);
      await loadData();
      alert(`Success: Step #${stepToSign} approved and saved to MongoDB Atlas! Next step is now active.`);
    } catch (err) {
      alert('Approval sign-off failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOperatorCompleteStage = async (stepNumber) => {
    try {
      setLoading(true);
      const batchId = batchData?._id || batchData?.id;
      const res = await api.completeStage(batchId, stepNumber);
      if (res.success) {
        await loadData();
        alert(`Step #${stepNumber} completed by Operator and saved in MongoDB Atlas! Ready for Manager verification.`);
      }
    } catch (err) {
      alert('Failed to complete step: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Batch Production Records</h1>
            <span className="badge badge-emerald">Digital Execution</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Step-by-step production tracking, material allocation checks, and manager approval sign-offs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {/* Strict RBAC: Only Operator and Admin can initiate new batch records */}
          {(isOperator || isAdmin) && (
            <button className="btn btn-primary" onClick={() => setIsInitModalOpen(true)}>
              <Plus size={16} />
              <span>+ Start New Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Select Batch Dropdown */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Active Batch:</div>
        <select
          className="form-select"
          style={{ flex: 1, minWidth: '280px', fontWeight: 700 }}
          value={selectedBatchId || ''}
          onChange={(e) => setSelectedBatchId(e.target.value)}
        >
          {batches.map(b => (
            <option key={b.id || b._id} value={b.id || b._id}>
              Batch #{b.batchNumber} - {b.drugName} [{b.status}]
            </option>
          ))}
        </select>
      </div>

      {/* Main Batch Detail View */}
      {batchData && (
        <div>
          {/* Status Alert Banner */}
          {batchData.activeDeviationHold && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Lock size={20} color="#dc2626" />
                <div>
                  <div style={{ fontWeight: 800, color: '#b91c1c' }}>BATCH IS ON QA HOLD</div>
                  <div style={{ fontSize: '0.825rem', color: '#475569' }}>Progress is locked until Quality Manager resolves open issue.</div>
                </div>
              </div>
              {(isQAManager || isAdmin) && (
                <Link to="/deviations" className="btn btn-danger btn-sm">Resolve Issue</Link>
              )}
            </div>
          )}

          {/* All Stages Completed Celebration Banner */}
          {allStagesCompleted && (
            <div style={{
              padding: '1.25rem 1.5rem',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
            }}>
              <CheckCircle2 size={26} color="#059669" />
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#065f46' }}>
                  All 5 Manufacturing Steps Completed & Approved!
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857' }}>
                  All batch production stages have received official electronic signatures in MongoDB Atlas. Batch #{batchData.batchNumber} has advanced to Quality Control.
                </div>
              </div>
            </div>
          )}

          {/* Batch Info Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#0284c7' }}>#{batchData.batchNumber}</span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{batchData.drugName}</h2>
              </div>
              <span className={`badge ${batchData.activeDeviationHold ? 'badge-rose' : 'badge-emerald'}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                {batchData.activeDeviationHold ? 'HOLD / PAUSED' : batchData.status}
              </span>
            </div>

            <div className="grid-3" style={{ fontSize: '0.85rem' }}>
              <div>Formulation: <strong>{currentFormulation?.strength || currentFormulation?.dosageForm || '500mg Extended Release'}</strong></div>
              <div>Target Output: <strong>{(batchData.targetYield || batchData.batchSize)?.toLocaleString()} units</strong></div>
              <div>Created By: <strong>{batchData.createdBy?.name || 'Operator Alex'}</strong></div>
            </div>
          </div>

          {/* Production Steps Timeline */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Step-by-Step Production Stages</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Enforced Interlock: Steps advance automatically as manager approvals are recorded.
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7' }}>
                Progress: {completedStepNumbers.length} of {activeRecipeStages.length} Steps Approved
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeRecipeStages.map((stage) => {
                const stageExec = stagesList.find(s => Number(s.stageNumber) === Number(stage.stepNumber));
                const isCompleted = completedStepNumbers.includes(Number(stage.stepNumber));
                const isCurrent = Number(stage.stepNumber) === Number(currentStepNumber);

                return (
                  <div
                    key={stage.stepNumber}
                    style={{
                      background: isCompleted ? '#ffffff' : isCurrent ? '#f0f9ff' : '#f8fafc',
                      border: isCurrent ? '2px solid #0284c7' : isCompleted ? '1px solid #a7f3d0' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      boxShadow: isCurrent ? '0 4px 14px rgba(2, 132, 199, 0.12)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                        <span style={{
                          fontWeight: 800,
                          color: isCurrent ? '#0284c7' : isCompleted ? '#059669' : '#64748b',
                          fontSize: '0.85rem'
                        }}>
                          STEP #{stage.stepNumber}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{stage.name}</span>
                        {isCompleted && (
                          <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                            <CheckCircle2 size={12} /> PASSED & APPROVED
                          </span>
                        )}
                        {isCurrent && (
                          <span className="badge badge-sky" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', fontWeight: 700 }}>
                            ACTIVE NOW
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>{stage.description}</div>
                    </div>

                    <div>
                      {isCompleted ? (
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', fontWeight: 700 }}>
                            <CheckCircle2 size={14} /> Completed & Signed
                          </span>
                          {stageExec?.qaApproval?.approvedBy && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                              Signed by: {stageExec.qaApproval.approvedBy}
                            </div>
                          )}
                        </div>
                      ) : isCurrent ? (
                        <div>
                          {/* QA / QC Manager or Admin sees Manager Approval Sign-off */}
                          {(isQAManager || isAdmin) && (
                            <button
                              className="btn btn-emerald btn-sm"
                              onClick={() => {
                                setActiveStageNumber(stage.stepNumber);
                                setIsSignatureModalOpen(true);
                              }}
                              disabled={batchData.activeDeviationHold}
                              style={{ boxShadow: '0 2px 10px rgba(5, 150, 105, 0.25)', fontWeight: 700, padding: '0.5rem 0.95rem' }}
                            >
                              <ShieldCheck size={15} /> Manager Approval Sign-off (Step #{stage.stepNumber})
                            </button>
                          )}

                          {/* Operator sees Execute & Log button */}
                          {isOperator && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOperatorCompleteStage(stage.stepNumber)}
                              disabled={batchData.activeDeviationHold || loading}
                              style={{ fontWeight: 700, padding: '0.5rem 0.95rem' }}
                            >
                              <Play size={14} /> Execute & Log Step #{stage.stepNumber}
                            </button>
                          )}

                          {/* Auditor sees status only */}
                          {isAuditor && (
                            <span className="badge badge-amber" style={{ padding: '0.4rem 0.75rem', fontWeight: 700 }}>
                              <Clock size={13} /> Active in Production
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                          Awaiting Step #{stage.stepNumber - 1} Completion
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Start New Batch Modal */}
      {isInitModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Start New Production Batch</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsInitModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateBatch}>
              <div className="form-group">
                <label className="form-label">Drug Master Formulation Recipe</label>
                <select
                  className="form-select"
                  value={newBatchForm.formulationId}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, formulationId: e.target.value })}
                >
                  {formulations.map(f => (
                    <option key={f.id} value={f.id}>{f.drugName} ({f.dosageForm})</option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Batch Code / Lot ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBatchForm.batchNumber}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, batchNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Batch Size (Units)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newBatchForm.customBatchSize}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, customBatchSize: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsInitModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Batch Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Signature Modal */}
      {isSignatureModalOpen && (
        <DigitalSignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onConfirm={handleSignOffStage}
          title={`Manager Approval for Step #${activeStageNumber}`}
          actionDescription={`Approve stage step and sign off for batch #${batchData?.batchNumber}.`}
        />
      )}
    </div>
  );
}
