import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  Layers,
  ArrowLeft,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Clock,
  FlaskConical,
  AlertTriangle,
  FileDown,
  QrCode,
  Scale
} from 'lucide-react';
import { BarcodeModal } from '../components/BarcodeModal';

export function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [formulation, setFormulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [barcodeOpen, setBarcodeOpen] = useState(false);

  useEffect(() => {
    async function loadBatch() {
      try {
        setLoading(true);
        const res = await api.getBatchById(id);
        if (res.success) {
          setBatch(res.batch);
          setFormulation(res.formulation);
        }
      } catch (err) {
        console.error('Failed to load batch details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBatch();
  }, [id]);

  const generatePDFBatchRecord = () => {
    if (!batch) return;

    const doc = new jsPDF();

    // Header & Compliance Banner
    doc.setFillColor(16, 24, 39);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AEGIS PHARMA - ELECTRONIC BATCH RECORD (EBR)', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('FDA 21 CFR Part 11 & cGMP Official Manufacturing Record', 14, 22);

    // Batch Overview Metadata
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. BATCH IDENTIFICATION & FORMULATION', 14, 40);

    const metaData = [
      ['Batch Number:', batch.batchNumber, 'Drug Name:', batch.drugName],
      ['Strength / Form:', `${batch.strength} (${batch.dosageForm})`, 'Batch Size:', `${batch.batchSize} ${batch.unit}`],
      ['Mfg Date:', batch.manufacturingDate, 'Expiry Date:', batch.expiryDate],
      ['Status:', batch.status, 'COA Certificate:', batch.finalRelease?.coaCertificateNumber || 'N/A']
    ];

    doc.autoTable({
      startY: 44,
      body: metaData,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2 }
    });

    // Material Traceability Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    let currentY = doc.lastAutoTable.finalY + 10;
    doc.text('2. RAW MATERIAL TRACEABILITY & BOM GENEALOGY', 14, currentY);

    const matRows = (batch.materialAllocations || []).map(m => [
      m.lotNumber,
      m.materialCode,
      m.materialName,
      `${m.allocatedQty} ${m.unit}`,
      m.scannedBy,
      new Date(m.scannedAt).toLocaleDateString()
    ]);

    doc.autoTable({
      startY: currentY + 4,
      head: [['Raw Lot #', 'Material Code', 'Description', 'Dispensed Qty', 'Verified By', 'Timestamp']],
      body: matRows.length > 0 ? matRows : [['No raw materials allocated', '-', '-', '-', '-', '-']],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129] }
    });

    // Stage Execution Logs & Digital Signatures
    currentY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. STAGE EXECUTION HISTORY & 21 CFR PART 11 SIGN-OFFS', 14, currentY);

    const stageRows = (batch.stageLogs || []).map(s => [
      `Stage ${s.stageNumber}: ${s.stageName}`,
      s.status,
      s.operatorName || 'N/A',
      s.qaApproval?.approved ? `SIGNED by ${s.qaApproval.qaName}\n(${s.qaApproval.signature})` : 'Pending'
    ]);

    doc.autoTable({
      startY: currentY + 4,
      head: [['Manufacturing Stage', 'Status', 'Operator', 'QA Manager 21 CFR 11 Digital Signature']],
      body: stageRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [6, 182, 212] }
    });

    // Lab Test Results
    if (batch.labResults && batch.labResults.length > 0) {
      currentY = doc.lastAutoTable.finalY + 10;
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('4. QC ANALYTICAL MONOGRAPH TEST RESULTS', 14, currentY);

      const qcRows = batch.labResults.map(q => [
        q.testName,
        q.standardRange,
        `${q.resultValue} ${q.unit}`,
        q.isConforming ? 'PASS (Conforms)' : 'FAIL (OOS)',
        q.testedBy
      ]);

      doc.autoTable({
        startY: currentY + 4,
        head: [['Test Name', 'USP/EP Standard', 'Result Value', 'Disposition', 'Analyst']],
        body: qcRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [139, 92, 246] }
      });
    }

    // Footer with Final Release Stamp
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`AegisPharma™ 21 CFR Part 11 Electronic Batch Record - Batch #${batch.batchNumber} - Page ${i} of ${pageCount}`, 14, 290);
    }

    doc.save(`AegisPharma_EBR_${batch.batchNumber}_${Date.now()}.pdf`);
  };

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="pulse-dot emerald" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Electronic Batch Record...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="main-content">
        <p>Batch record not found.</p>
        <Link to="/execution" className="btn btn-secondary">Back to Execution</Link>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/execution" className="btn btn-secondary btn-sm">
            <ArrowLeft size={15} /> Back
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Batch #{batch.batchNumber}</h1>
              <span className="badge badge-emerald">360° EBR Record</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {batch.drugName} • {batch.strength} ({batch.dosageForm})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setBarcodeOpen(true)}>
            <QrCode size={15} />
            <span>Barcode / QR</span>
          </button>
          <button className="btn btn-primary" onClick={generatePDFBatchRecord}>
            <FileDown size={15} />
            <span>Export Official EBR PDF</span>
          </button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BATCH STATUS</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: batch.status === 'APPROVED' ? 'var(--emerald-400)' : 'var(--cyan-400)', marginTop: '0.2rem' }}>
            {batch.status}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BATCH SIZE</div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
            {batch.batchSize?.toLocaleString()} {batch.unit}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MANUFACTURING DATE</div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
            {batch.manufacturingDate}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EXPIRATION DATE</div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--emerald-400)', marginTop: '0.2rem' }}>
            {batch.expiryDate}
          </div>
        </div>
      </div>

      {/* Certificate of Analysis Banner if Approved */}
      {batch.finalRelease?.status === 'APPROVED' && (
        <div className="crypto-stamp-box" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--emerald-400)', fontWeight: 800, fontSize: '1.1rem' }}>
                <ShieldCheck size={22} />
                <span>OFFICIAL CERTIFICATE OF ANALYSIS (COA) RELEASED</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Certificate #: <strong className="mono" style={{ color: 'var(--cyan-400)' }}>{batch.finalRelease.coaCertificateNumber}</strong> • Released by: <strong>{batch.finalRelease.releasedBy}</strong> on {new Date(batch.finalRelease.releaseDate).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                "{batch.finalRelease.comments}"
              </div>
            </div>
            <span className="badge badge-emerald" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              RELEASED FOR PACKAGING & COMMERCE
            </span>
          </div>
        </div>
      )}

      {/* Traceability & Bill of Materials */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Scale size={18} color="var(--cyan-400)" />
          <span>Raw Material Traceability & Genealogy</span>
        </h3>
        {(!batch.materialAllocations || batch.materialAllocations.length === 0) ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No raw materials recorded for this batch.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0' }}>Raw Lot #</th>
                  <th>Material Code</th>
                  <th>Description</th>
                  <th>Dispensed Qty</th>
                  <th>Scanned By</th>
                  <th>Scanned At</th>
                </tr>
              </thead>
              <tbody>
                {batch.materialAllocations.map((mat, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(31, 45, 69, 0.4)' }}>
                    <td className="mono" style={{ padding: '0.65rem 0', color: 'var(--cyan-400)', fontWeight: 700 }}>{mat.lotNumber}</td>
                    <td className="mono">{mat.materialCode}</td>
                    <td style={{ color: '#fff' }}>{mat.materialName}</td>
                    <td className="mono" style={{ color: 'var(--emerald-400)', fontWeight: 700 }}>{mat.allocatedQty} {mat.unit}</td>
                    <td>{mat.scannedBy}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(mat.scannedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stage Progression & Sign-offs */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="var(--emerald-400)" />
          <span>Sequential Stage Execution & 21 CFR Part 11 Digital Signatures</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {batch.stageLogs?.map((stage) => (
            <div key={stage.stageNumber} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className="mono" style={{ color: 'var(--cyan-400)', fontWeight: 800 }}>Stage {stage.stageNumber}:</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{stage.stageName}</span>
                </div>
                {stage.qaApproval?.approved ? (
                  <span className="badge badge-emerald">
                    <CheckCircle2 size={13} /> QA SIGNED OFF
                  </span>
                ) : (
                  <span className="badge badge-slate">{stage.status}</span>
                )}
              </div>

              {stage.qaApproval?.approved && (
                <div className="crypto-stamp-box" style={{ fontSize: '0.8rem' }}>
                  <div><strong>Digital Sign-off by:</strong> {stage.qaApproval.qaName} on {new Date(stage.qaApproval.timestamp).toLocaleString()}</div>
                  <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--cyan-400)', marginTop: '0.2rem' }}>
                    Token: {stage.qaApproval.signature}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    "{stage.qaApproval.comments}"
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Barcode Modal */}
      <BarcodeModal
        isOpen={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        item={batch}
        type="BATCH"
      />
    </div>
  );
}
