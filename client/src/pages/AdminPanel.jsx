import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Settings,
  Users,
  Plus,
  ShieldCheck,
  KeyRound,
  FileCode2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [formulations, setFormulations] = useState([]);
  const [loading, setLoading] = useState(true);

  // New User Form Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'OPERATOR',
    department: 'Solid Dosage Manufacturing',
    password: 'Pharma@2026',
    pin: '1234'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, fRes] = await Promise.all([
        api.getUsers(),
        api.getFormulations()
      ]);
      if (uRes.success) setUsers(uRes.users || []);
      if (fRes.success) setFormulations(fRes.formulations || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.registerUser(userForm);
      if (res.success) {
        setIsUserModalOpen(false);
        setUserForm({
          username: '',
          fullName: '',
          email: '',
          role: 'OPERATOR',
          department: 'Solid Dosage Manufacturing',
          password: 'Pharma@2026',
          pin: '1234'
        });
        await fetchData();
        alert('User registered successfully.');
      }
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>System Administration & Master Data</h1>
            <span className="badge badge-amber">System Admin Portal</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            User role provisioning, 21 CFR Part 11 security policies, master drug recipes, and plant parameters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={async () => {
              if (window.confirm("Are you sure you want to WIPE all recorded materials, batches, and deviations to start completely fresh?")) {
                const res = await api.resetFreshSlate();
                alert(res.message);
                window.location.reload();
              }
            }}
          >
            <span>🗑️ Reset All Data to Fresh Slate</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsUserModalOpen(true)}>
            <Plus size={16} />
            <span>Provision User Account</span>
          </button>
        </div>
      </div>

      {/* Users Management Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Users size={20} color="var(--amber-400)" />
          <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Provisioned Plant Personnel & Role Permissions</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Employee ID</th>
                <th>Full Name & Username</th>
                <th>Email</th>
                <th>Assigned Role</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(31, 45, 69, 0.4)' }}>
                  <td className="mono" style={{ padding: '0.65rem 0.5rem', color: 'var(--cyan-400)', fontWeight: 700 }}>
                    {u.employeeId}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{u.fullName}</div>
                    <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'QA_QC_MANAGER' ? 'badge-emerald' : u.role === 'OPERATOR' ? 'badge-cyan' : u.role === 'AUDITOR' ? 'badge-purple' : 'badge-amber'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.department}</td>
                  <td>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Master Formulations Management */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <FileCode2 size={20} color="var(--emerald-400)" />
          <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Master Drug Formulations & BOM Specifications</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {formulations.map((form) => (
            <div key={form.id} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="mono" style={{ color: 'var(--cyan-400)', fontWeight: 800 }}>{form.drugCode}</span>
                <span className="badge badge-emerald">{form.dosageForm}</span>
              </div>

              <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '0.25rem' }}>{form.drugName}</h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Strength: <strong>{form.strength}</strong> • Batch Size: <strong>{form.targetBatchSize?.toLocaleString()} {form.unit}</strong>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <div><strong>Validated Stages ({form.stages?.length}):</strong></div>
                <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {form.stages?.map(s => s.name).join(' → ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provision User Modal */}
      {isUserModalOpen && (
        <div className="modal-overlay" onClick={() => setIsUserModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Users size={20} color="var(--amber-400)" />
                <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Provision New Plant User</h3>
              </div>
            </div>

            <form onSubmit={handleCreateUser} style={{ padding: '1.5rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Role Assignment *</label>
                  <select
                    className="form-select"
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="OPERATOR">Production Operator</option>
                    <option value="QA_QC_MANAGER">QA/QC Manager</option>
                    <option value="AUDITOR">External Auditor</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Default Password</label>
                  <input
                    type="text"
                    className="form-input"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">4-Digit Security PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    className="form-input mono"
                    value={userForm.pin}
                    onChange={(e) => setUserForm({ ...userForm, pin: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUserModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  <span>Create User Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
