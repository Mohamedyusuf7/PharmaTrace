import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  LayoutDashboard,
  Boxes,
  ClipboardList,
  CheckSquare,
  History,
  LogOut,
  User,
  Database
} from 'lucide-react';

export function Navbar() {
  const { user, isQAManager, isAdmin, isAuditor, logout } = useAuth();
  const location = useLocation();

  // Navigation items filtered strictly by user role
  const allNavItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['OPERATOR', 'QA_QC_MANAGER', 'QA_MANAGER', 'AUDITOR', 'ADMIN'] },
    { label: 'Raw Materials', path: '/materials', icon: Boxes, roles: ['OPERATOR', 'QA_QC_MANAGER', 'QA_MANAGER', 'AUDITOR', 'ADMIN'] },
    { label: 'Production Batches', path: '/execution', icon: ClipboardList, roles: ['OPERATOR', 'QA_QC_MANAGER', 'QA_MANAGER', 'AUDITOR', 'ADMIN'] },
    { label: 'Manager Approvals', path: '/deviations', icon: CheckSquare, roles: ['QA_QC_MANAGER', 'QA_MANAGER', 'ADMIN'] },
    { label: 'Activity Log', path: '/auditor', icon: History, roles: ['OPERATOR', 'QA_QC_MANAGER', 'QA_MANAGER', 'AUDITOR', 'ADMIN'] }
  ];

  const userRole = user?.role || 'OPERATOR';
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  // Role display badge properties
  const roleDisplay = {
    OPERATOR: { label: 'Operator', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
    QA_QC_MANAGER: { label: 'QA Manager', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
    QA_MANAGER: { label: 'QA Manager', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
    AUDITOR: { label: 'Auditor', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
    ADMIN: { label: 'System Admin', color: '#b45309', bg: '#fffbeb', border: '#fde68a' }
  }[userRole] || { label: userRole, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '0.75rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 3px 8px rgba(2, 132, 199, 0.25)'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>PharmaTrace™</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Digital GMP Traceability System</div>
          </div>
        </Link>

        {/* Dynamic RBAC Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  color: isActive ? '#0369a1' : '#475569',
                  background: isActive ? '#f0f9ff' : 'transparent',
                  border: isActive ? '1px solid #bae6fd' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 600,
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={isActive ? '#0284c7' : '#64748b'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          {/* Cloud Database Connected Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '20px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#047857'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <span>MongoDB Atlas</span>
          </div>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {user.fullName}
                </div>
                <div style={{ marginTop: '0.15rem' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: roleDisplay.color,
                    background: roleDisplay.bg,
                    border: `1px solid ${roleDisplay.border}`,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '4px'
                  }}>
                    {roleDisplay.label}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="btn btn-secondary btn-sm"
                title="Log out of current session"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#dc2626',
                  borderColor: '#fecaca',
                  background: '#fef2f2'
                }}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
