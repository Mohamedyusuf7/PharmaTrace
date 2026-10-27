import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, KeyRound, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Selected Role State
  const [selectedRole, setSelectedRole] = useState('OPERATOR');
  const [password, setPassword] = useState('operator123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 4 Defined Roles with their dedicated passwords
  const roleAccounts = [
    {
      role: 'OPERATOR',
      title: 'Production Operator',
      name: 'Alex Mercer',
      password: 'operator123',
      desc: 'Can add raw material items, dispense batches, and log production stages',
      badgeColor: '#0284c7',
      bgLight: '#f0f9ff'
    },
    {
      role: 'QA_QC_MANAGER',
      title: 'QA / QC Manager',
      name: 'Dr. Elena Rostova',
      password: 'manager123',
      desc: 'Approves quarantine materials, releases finished batches, resolves issues',
      badgeColor: '#047857',
      bgLight: '#ecfdf5'
    },
    {
      role: 'AUDITOR',
      title: 'External Auditor',
      name: 'David Vance',
      password: 'auditor123',
      desc: 'Inspects immutable activity logs and verifies security signatures',
      badgeColor: '#6d28d9',
      bgLight: '#f5f3ff'
    },
    {
      role: 'ADMIN',
      title: 'System Admin',
      name: 'Sarah Chen',
      password: 'admin123',
      desc: 'Full administrative control over user accounts and recipes',
      badgeColor: '#b45309',
      bgLight: '#fffbeb'
    }
  ];

  const handleSelectRole = (r) => {
    setSelectedRole(r.role);
    setPassword(r.password);
    setError('');
  };

  const handleRoleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({ role: selectedRole, password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check the password.');
    } finally {
      setLoading(false);
    }
  };

  const currentRoleObj = roleAccounts.find(r => r.role === selectedRole) || roleAccounts[0];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top center, #f0f9ff 0%, #e2e8f0 100%)',
      padding: '2rem 1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: '980px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2.5rem', alignItems: 'center' }}>
        
        {/* Left Side: System Information */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
            }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>PharmaTrace™</h1>
              <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 700 }}>
                Digital Batch Traceability & Quality Management
              </div>
            </div>
          </div>

          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Select your role below and enter the role password to access the system. All activities, raw material additions, and approvals are stored directly in your cloud database.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {roleAccounts.map((acc) => {
              const isSelected = selectedRole === acc.role;
              return (
                <div
                  key={acc.role}
                  onClick={() => handleSelectRole(acc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.1rem',
                    borderRadius: '10px',
                    border: isSelected ? `2px solid ${acc.badgeColor}` : '1px solid #e2e8f0',
                    background: isSelected ? acc.bgLight : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.925rem', color: '#0f172a' }}>{acc.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({acc.name})</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>{acc.desc}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#e2e8f0',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '5px',
                      color: '#334155'
                    }}>
                      Key: {acc.password}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Password Entry Card */}
        <div className="glass-panel" style={{ padding: '2.25rem', background: '#ffffff', boxShadow: '0 15px 35px rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <UserCheck size={22} color={currentRoleObj.badgeColor} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Role Login</h2>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Logging in as: <strong style={{ color: currentRoleObj.badgeColor }}>{currentRoleObj.title} ({currentRoleObj.name})</strong>
          </p>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRoleLogin}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">
                Enter Password for {currentRoleObj.title}
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', width: '100%', fontSize: '0.95rem', fontWeight: 600 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Type ${currentRoleObj.password}`}
                  required
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                Separate role password: <strong style={{ color: '#0f172a' }}>{currentRoleObj.password}</strong>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
              disabled={loading}
            >
              <Lock size={16} />
              <span>{loading ? 'Authenticating...' : `Enter System as ${currentRoleObj.title}`}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
            <span style={{ fontWeight: 700, color: '#047857' }}>● Connected to MongoDB Atlas:</span> All raw materials, batch records, and actions you perform are saved directly to your live database.
          </div>
        </div>

      </div>
    </div>
  );
}
