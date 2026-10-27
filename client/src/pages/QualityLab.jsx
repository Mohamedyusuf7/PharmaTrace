import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DigitalSignatureModal } from '../components/DigitalSignatureModal';
import {
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronRight,
  RefreshCw,
  FileCheck2
} from 'lucide-react';

const STATIC_QC_BATCHES = [
  {
    id: "BATCH-PCM-2026-001",
    batchNumber: "BCH-2026-9841",
    drugName: "Paracetamol Extended Release 500mg",
    status: "QC_TESTING",
    activeDeviationHold: false,
    labResults: [
      { testName: "Purity & Active Ingredient Assay", resultValue: "99.8", standardRange: "98.5% - 101.5%", isConforming: true, testedBy: "Dr. Elena Rostova" },
      { testName: "Dissolution Rate (45 mins)", resultValue: "94.5", standardRange: "≥ 85.0%", isConforming: true, testedBy: "Dr. Elena Rostova" },
      { testName: "Tablet Hardness", resultValue: "12.4", standardRange: "9.5 - 14.5 kp", isConforming: true, testedBy: "Dr. Elena Rostova" }
    ]
  },
  {
    id: "BATCH-AMX-2026-002",
    batchNumber: "BCH-2026-4412",
    drugName: "Amoxicillin Trihydrate Capsules 250mg",
    status: "APPROVED",
    activeDeviationHold: false,
    labResults: [
      { testName: "Assay Purity", resultValue: "100.2", standardRange: "99.0% - 102.0%", isConforming: true, testedBy: "Dr. Elena Rostova" }
    ]
  }
];

export function QualityLab() {
  const { user, isQAManager } = useAuth();
  const [batches, setBatches] = useState(STATIC_QC_BATCHES);
  const [selectedBatchId, setSelectedBatchId] = useState(STATIC_QC_BATCHES[0].id);
  const [selectedBatch, setSelectedBatch] = useState(STATIC_QC_BATCHES[0]);
  const [loading, setLoading] = useState(false);

  // Lab Test Entry Form State
  const [labTests, setLabTests] = useState({
    purity: '99.8',
    dissolution: '94.5',
    ph: '6.02',
    hardness: '12.4'
  });

  const [isFinalReleaseOpen, setIsFinalReleaseOpen] = useState(false);
  const [releaseDecision, setReleaseDecision] = useState('APPROVED');

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.getBatches();
      if (res.success && res.batches && res.batches.length > 0) {
        setBatches(res.batches);
      } else {
        setBatches(STATIC_QC_BATCHES);
      }
    } catch (err) {
      console.error('Using static default QC batches:', err);
      setBatches(STATIC_QC_BATCHES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      const found = batches.find(b => b.id === selectedBatchId) || STATIC_QC_BATCHES[0];
      setSelectedBatch(found);
    }
  }, [selectedBatchId, batches]);

  const handleSubmitLabResults = async (e) => {
    e.preventDefault();
    try {
      const testsToSubmit = [
        { testName: 'Active Ingredient Purity', parameter: 'Purity Assay', resultValue: labTests.purity, unit: '%' },
        { testName: 'Dissolution Rate', parameter: 'Dissolution', resultValue: labTests.dissolution, unit: '%' },
        { testName: 'pH Balance', parameter: 'pH', resultValue: labTests.ph, unit: 'pH' },
        { testName: 'Tablet Hardness', parameter: 'Hardness', resultValue: labTests.hardness, unit: 'kp' }
      ];

      const res = await api.logLabResults(selectedBatch.id, { tests: testsToSubmit });
      alert(res.message || 'Quality Lab Test Results Recorded Successfully!');
      fetchBatches();
    } catch (err) {
      alert('Failed to log test results: ' + err.message);
    }
  };

  const handleFinalBatchRelease = async ({ pin, password, reason }) => {
    try {
      await api.releaseBatch(selectedBatch.id, {
        decision: releaseDecision,
        signaturePin: pin,
        signaturePassword: password,
        signatureReason: reason
      });
      alert(`Batch #${selectedBatch.batchNumber} has been officially ${releaseDecision === 'APPROVED' ? 'Released for Market Sale' : 'Rejected'}!`);
      setIsFinalReleaseOpen(false);
      fetchBatches();
    } catch (err) {
      alert('Batch release sign-off failed: ' + err.message);
    }
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Quality Control & Lab Testing</h1>
            <span className="badge badge-emerald">QA Laboratory</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Record product purity, dissolution rates, tablet hardness, and issue final manager approvals.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchBatches}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Select Batch */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Select Batch for Lab Testing:</div>
        <select
          className="form-select"
          style={{ flex: 1, minWidth: '280px', fontWeight: 700 }}
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
        >
          {batches.map(b => (
            <option key={b.id} value={b.id}>
              Batch #{b.batchNumber} - {b.drugName} [{b.status}]
            </option>
          ))}
        </select>
      </div>

      {selectedBatch && (
        <div className="grid-2">
          {/* Lab Test Input Form */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FlaskConical size={20} color="#0284c7" />
              <span>Enter Lab Test Results</span>
            </h2>

            <form onSubmit={handleSubmitLabResults}>
              <div className="form-group">
                <label className="form-label">Active Ingredient Purity (%) [Standard: 98.5% - 101.5%]</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={labTests.purity}
                  onChange={(e) => setLabTests({ ...labTests, purity: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dissolution Rate (%) [Standard: ≥ 85.0%]</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={labTests.dissolution}
                  onChange={(e) => setLabTests({ ...labTests, dissolution: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">pH Balance Level [Standard: 5.5 - 6.5]</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={labTests.ph}
                  onChange={(e) => setLabTests({ ...labTests, ph: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tablet Hardness (kp) [Standard: 9.5 - 14.5 kp]</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={labTests.hardness}
                  onChange={(e) => setLabTests({ ...labTests, hardness: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Submit Quality Test Results
              </button>
            </form>
          </div>

          {/* Existing Lab Results & Final Release */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Recorded Test History</h2>
              {selectedBatch.status !== 'APPROVED' && (
                <button
                  className="btn btn-emerald btn-sm"
                  onClick={() => setIsFinalReleaseOpen(true)}
                  disabled={selectedBatch.activeDeviationHold}
                >
                  <ShieldCheck size={14} /> Final QA Release Sign-off
                </button>
              )}
            </div>

            {selectedBatch.labResults && selectedBatch.labResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedBatch.labResults.map((t, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <strong style={{ color: '#0f172a' }}>{t.testName}</strong>
                      <span className={`badge ${t.isConforming ? 'badge-emerald' : 'badge-rose'}`}>
                        {t.isConforming ? 'PASSED' : 'OUT OF SPEC'}
                      </span>
                    </div>
                    <div style={{ color: '#475569' }}>
                      Result: <strong className="mono" style={{ color: t.isConforming ? '#047857' : '#b91c1c' }}>{t.resultValue}</strong> (Spec: {t.standardRange})
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No lab tests logged yet for this batch. Fill in form on the left.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {isFinalReleaseOpen && (
        <DigitalSignatureModal
          isOpen={isFinalReleaseOpen}
          onClose={() => setIsFinalReleaseOpen(false)}
          onConfirm={handleFinalBatchRelease}
          title={`Final Quality Release for Batch #${selectedBatch?.batchNumber}`}
          actionDescription={`Confirm QA release decision: "${releaseDecision}" for market distribution.`}
        />
      )}
    </div>
  );
}
