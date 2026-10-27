import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, X, ShieldCheck, Check } from 'lucide-react';

export function BarcodeModal({ isOpen, onClose, item, type = "MATERIAL" }) {
  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  const isMaterial = type === "MATERIAL";
  const title = isMaterial ? `RAW MATERIAL LOT #${item.lotNumber}` : `EBR BATCH #${item.batchNumber}`;
  const qrData = JSON.stringify({
    type,
    id: item.id,
    code: isMaterial ? item.materialCode : item.drugCode || item.batchNumber,
    lotOrBatch: isMaterial ? item.lotNumber : item.batchNumber,
    name: item.name || item.drugName,
    status: item.status,
    expiryDate: item.expiryDate,
    standard: "FDA-21CFR11-GMP"
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <QrCode size={20} color="var(--emerald-400)" />
            <h3 style={{ fontSize: '1.05rem', color: '#fff' }}>Digital GMP Barcode Label</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Printable Label View */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            background: '#ffffff',
            color: '#000000',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '2px dashed #334155',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', borderBottom: '2px solid #000', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              <ShieldCheck size={16} color="#059669" />
              <span style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.05em' }}>AEGIS PHARMA GMP LABEL</span>
            </div>

            <div style={{ margin: '0.75rem 0', display: 'flex', justifyContent: 'center' }}>
              <QRCodeSVG
                value={qrData}
                size={140}
                level="H"
                includeMargin={true}
              />
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {isMaterial ? item.lotNumber : item.batchNumber}
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              {item.name || item.drugName}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.25rem',
              fontSize: '0.7rem',
              textAlign: 'left',
              borderTop: '1px solid #cbd5e1',
              paddingTop: '0.5rem'
            }}>
              <div><strong>Status:</strong> {item.status}</div>
              <div><strong>Exp:</strong> {item.expiryDate}</div>
              <div><strong>Qty:</strong> {item.quantity ? `${item.quantity} ${item.unit}` : `${item.batchSize} ${item.unit}`}</div>
              <div><strong>Std:</strong> USP Monograph</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Print Cleanroom Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
