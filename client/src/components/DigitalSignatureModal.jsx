import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, KeyRound, AlertCircle, X } from 'lucide-react';

export function DigitalSignatureModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Manager Approval Required",
  actionDescription = "Please enter your Security PIN to approve this item."
}) {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('Reviewed and approved by Quality Manager.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pin || pin.trim().length === 0) {
      setErrorMsg('Please enter your Manager Password (manager123) or PIN (1234).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        pin: pin.trim(),
        signaturePin: pin.trim(),
        password: pin.trim(),
        signaturePassword: pin.trim(),
        reason: reason.trim(),
        signatureReason: reason.trim()
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed. Password: manager123 or PIN: 1234');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={24} color="#047857" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.25rem' }}>
          {actionDescription}
        </p>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem', borderRadius: '8px', fontSize: '0.825rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Approval Note / Reason</label>
            <input
              type="text"
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Manager Approval Password or PIN *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                autoFocus
                placeholder="Enter password (manager123) or PIN (1234)"
                className="form-input"
                style={{ fontSize: '1rem', fontWeight: 600, paddingLeft: '1rem' }}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
            <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '0.4rem', fontWeight: 600 }}>
              💡 Sign-off Password: <strong>manager123</strong> &nbsp;|&nbsp; PIN: <strong>1234</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-emerald" disabled={isSubmitting}>
              <KeyRound size={16} />
              <span>{isSubmitting ? 'Approving...' : 'Confirm Approval'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
