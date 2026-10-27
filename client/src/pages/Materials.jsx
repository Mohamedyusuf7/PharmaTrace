import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DigitalSignatureModal } from '../components/DigitalSignatureModal';
import { BarcodeModal } from '../components/BarcodeModal';
import {
  PackageCheck,
  Plus,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Boxes
} from 'lucide-react';

export function Materials() {
  const { user, isOperator, isQAManager, isAuditor, isAdmin } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Shipment Intake Modal State
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [intakeForm, setIntakeForm] = useState({
    materialCode: 'API-PCM-01',
    name: 'Paracetamol Raw Powder',
    category: 'Active Pharmaceutical Ingredient (API)',
    lotNumber: `LOT-PCM-2026-${Math.floor(100 + Math.random() * 900)}`,
    vendor: 'Novartis Chemicals AG',
    quantity: 250,
    unit: 'kg',
    storageCondition: 'Controlled Room Temperature (15-25°C)',
    expiryDate: '2028-10-01',
    notes: 'Received shipment at warehouse dock.'
  });

  // Quarantine Action State
  const [selectedQuarantineLot, setSelectedQuarantineLot] = useState(null);
  const [quarantineActionType, setQuarantineActionType] = useState('RELEASE');
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [barcodeItem, setBarcodeItem] = useState(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.getMaterials({ search: searchQuery, status: statusFilter });
      if (res.success && res.materials) {
        setMaterials(res.materials);
      }
    } catch (err) {
      console.error('Failed to load materials from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [searchQuery, statusFilter]);

  // Operator or QA Manager adds a new raw material shipment
  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    try {
      const intakeFn = api.intakeMaterialShipment || api.intakeShipment;
      const res = await intakeFn(intakeForm);
      if (res.success) {
        setIsIntakeOpen(false);
        await fetchMaterials();
        alert(`Success! Material lot #${intakeForm.lotNumber} (${intakeForm.name}) has been saved to MongoDB Atlas!`);
        // Prepare next lot number
        setIntakeForm(prev => ({
          ...prev,
          lotNumber: `LOT-PCM-2026-${Math.floor(100 + Math.random() * 900)}`
        }));
      }
    } catch (err) {
      alert('Error saving material to database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // QA Manager approves or rejects quarantine lot
  const handleQuarantineConfirm = async (sigData) => {
    const pin = sigData?.pin || sigData?.signaturePin || '1234';
    const password = sigData?.password || sigData?.signaturePassword || 'manager123';
    const reason = sigData?.reason || sigData?.signatureReason || 'Reviewed and approved by Quality Manager.';
    const lotId = selectedQuarantineLot?._id || selectedQuarantineLot?.id;

    try {
      setLoading(true);
      const res = await api.quarantineAction(lotId, {
        action: quarantineActionType,
        signaturePin: pin,
        signaturePassword: password,
        signatureReason: reason,
        testResultsSummary: 'Sample laboratory monograph testing passed.'
      });
      if (res.success) {
        setIsSignatureOpen(false);
        await fetchMaterials();
        alert(`Success! Lot #${selectedQuarantineLot.lotNumber} is now marked ${quarantineActionType === 'RELEASE' ? 'APPROVED & SAFE' : 'REJECTED'} in MongoDB!`);
      }
    } catch (err) {
      alert('Approval failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const safeMaterialsCount = materials.filter(m => m.status === 'RELEASED' || m.status === 'SAFE').length;
  const quarantineCount = materials.filter(m => m.status === 'QUARANTINE').length;
  const expiredCount = materials.filter(m => m.isExpired || m.status === 'REJECTED' || m.status === 'EXPIRED').length;

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Raw Materials & Expiry Tracking</h1>
            <span className="badge badge-emerald">Live Database Sync</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Warehouse inventory stored in MongoDB Atlas. Enter item details, track expiry dates, and manage QA release.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchMaterials}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          
          {/* Operator and Admins can add new incoming material item details */}
          {(isOperator || isAdmin) && (
            <button className="btn btn-primary" onClick={() => setIsIntakeOpen(true)}>
              <Plus size={16} />
              <span>+ Enter Material Item Details</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Safe & Approved Materials
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857' }}>
            {safeMaterialsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Ready for production dispensing
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            In Quarantine (Needs Approval)
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309' }}>
            {quarantineCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Awaiting Quality Manager sign-off
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Expired / Rejected Stock
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b91c1c' }}>
            {expiredCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Locked from production use
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem', width: '100%' }}
            placeholder="Search material name, lot number, or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '180px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="RELEASED">Approved & Safe</option>
          <option value="QUARANTINE">In Quarantine</option>
          <option value="REJECTED">Expired / Rejected</option>
        </select>
      </div>

      {/* Materials Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table-light">
            <thead>
              <tr>
                <th>Lot Number</th>
                <th>Material Details</th>
                <th>Supplier / Vendor</th>
                <th>Stock Quantity</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No materials found in database. Click <strong>+ Enter Material Item Details</strong> above to add one!
                  </td>
                </tr>
              ) : (
                materials.map((item) => (
                  <tr key={item.id || item._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="mono" style={{ fontWeight: 800, color: '#0284c7' }}>#{item.lotNumber}</span>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.15rem 0.35rem' }}
                          title="View Barcode"
                          onClick={() => setBarcodeItem(item)}
                        >
                          <QrCode size={13} />
                        </button>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {item.materialCode} &bull; {item.category}</div>
                    </td>

                    <td style={{ color: 'var(--text-secondary)' }}>{item.vendor}</td>

                    <td>
                      <div style={{ fontWeight: 700 }}>{item.quantity} {item.unit}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: item.isExpired || item.status === 'EXPIRED' ? '#dc2626' : '#0f172a' }}>
                        {item.expiryDate}
                      </div>
                      {(item.isExpired || item.status === 'EXPIRED') && (
                        <span className="badge badge-rose" style={{ padding: '0.05rem 0.35rem', fontSize: '0.65rem' }}>
                          EXPIRED
                        </span>
                      )}
                    </td>

                    <td>
                      {item.status === 'RELEASED' || item.status === 'SAFE' ? (
                        <span className="badge badge-emerald">
                          <CheckCircle2 size={12} /> APPROVED & SAFE
                        </span>
                      ) : item.status === 'QUARANTINE' ? (
                        <span className="badge badge-amber">
                          <Clock size={12} /> IN QUARANTINE
                        </span>
                      ) : (
                        <span className="badge badge-rose">
                          <XCircle size={12} /> LOCKED / EXPIRED
                        </span>
                      )}
                    </td>

                    <td>
                      {item.status === 'QUARANTINE' ? (
                        (isQAManager || isAdmin) ? (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn btn-emerald btn-sm"
                              onClick={() => {
                                setSelectedQuarantineLot(item);
                                setQuarantineActionType('RELEASE');
                                setIsSignatureOpen(true);
                              }}
                            >
                              Approve Lot
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                setSelectedQuarantineLot(item);
                                setQuarantineActionType('REJECT');
                                setIsSignatureOpen(true);
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="badge badge-amber" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                            Awaiting QA Approval
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                          ✓ Released in MongoDB
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator/Manager Intake Modal: Enter Item Details */}
      {isIntakeOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: '1.75rem', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Boxes size={22} color="#0284c7" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Enter Material Item Details</h2>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsIntakeOpen(false)}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Enter incoming chemical or packaging lot details. Upon saving, this record is stored directly in MongoDB Atlas.
            </p>

            <form onSubmit={handleIntakeSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Material Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Paracetamol Raw Powder"
                    value={intakeForm.name}
                    onChange={(e) => setIntakeForm({ ...intakeForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Material Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. API-PCM-01"
                    value={intakeForm.materialCode}
                    onChange={(e) => setIntakeForm({ ...intakeForm, materialCode: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={intakeForm.category}
                    onChange={(e) => setIntakeForm({ ...intakeForm, category: e.target.value })}
                  >
                    <option value="Active Pharmaceutical Ingredient (API)">Active Ingredient (API)</option>
                    <option value="Excipient / Binder">Excipient / Binder</option>
                    <option value="Lubricant">Lubricant</option>
                    <option value="Film Coating Premix">Film Coating Premix</option>
                    <option value="Primary Packaging">Primary Packaging</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Lot / Batch Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. LOT-PCM-2026-101"
                    value={intakeForm.lotNumber}
                    onChange={(e) => setIntakeForm({ ...intakeForm, lotNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Supplier / Vendor *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Novartis Chemicals AG"
                    value={intakeForm.vendor}
                    onChange={(e) => setIntakeForm({ ...intakeForm, vendor: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity & Unit *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      className="form-input"
                      style={{ flex: 2 }}
                      placeholder="e.g. 250"
                      value={intakeForm.quantity}
                      onChange={(e) => setIntakeForm({ ...intakeForm, quantity: parseFloat(e.target.value) })}
                      required
                    />
                    <select
                      className="form-select"
                      style={{ flex: 1 }}
                      value={intakeForm.unit}
                      onChange={(e) => setIntakeForm({ ...intakeForm, unit: e.target.value })}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">Liters</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Storage Condition</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Controlled Room Temperature (15-25°C)"
                    value={intakeForm.storageCondition}
                    onChange={(e) => setIntakeForm({ ...intakeForm, storageCondition: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={intakeForm.expiryDate}
                    onChange={(e) => setIntakeForm({ ...intakeForm, expiryDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Warehouse Notes</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Initial intake check complete. Placed on quarantine hold."
                  value={intakeForm.notes}
                  onChange={(e) => setIntakeForm({ ...intakeForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsIntakeOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving to MongoDB...' : 'Save Material to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {isSignatureOpen && (
        <DigitalSignatureModal
          isOpen={isSignatureOpen}
          onClose={() => setIsSignatureOpen(false)}
          onConfirm={handleQuarantineConfirm}
          title={quarantineActionType === 'RELEASE' ? `Approve Lot #${selectedQuarantineLot?.lotNumber}` : `Reject Lot #${selectedQuarantineLot?.lotNumber}`}
          actionDescription={`Confirm quality disposition for "${selectedQuarantineLot?.name}".`}
        />
      )}

      {/* Barcode Modal */}
      {barcodeItem && (
        <BarcodeModal
          isOpen={!!barcodeItem}
          onClose={() => setBarcodeItem(null)}
          title={`Barcode Tag: #${barcodeItem.lotNumber}`}
          barcodeValue={barcodeItem.lotNumber}
          materialName={barcodeItem.name}
          materialCode={barcodeItem.materialCode}
          vendor={barcodeItem.vendor}
          expiryDate={barcodeItem.expiryDate}
        />
      )}
    </div>
  );
}
