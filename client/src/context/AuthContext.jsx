import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('aegis_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getProfile();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch (err) {
          console.error('Session validation error:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []); // Run only once on initial app load

  const login = async (credentials, password) => {
    setError(null);
    try {
      const res = await api.login(credentials, password);
      if (res.success) {
        localStorage.setItem('aegis_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const switchRole = async (targetRole) => {
    try {
      // Map legacy QA_QC_MANAGER to backend role QA_MANAGER
      const roleToUse = targetRole === 'QA_QC_MANAGER' ? 'QA_MANAGER' : targetRole;
      const res = await api.switchRole(roleToUse);
      if (res.success) {
        localStorage.setItem('aegis_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      console.error('Switch role failed:', err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('aegis_token');
    setToken(null);
    setUser(null);
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(user.role);
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    switchRole,
    logout,
    hasRole,
    isOperator: user?.role === 'OPERATOR',
    isQAManager: user?.role === 'QA_MANAGER' || user?.role === 'QA_QC_MANAGER',
    isAuditor: user?.role === 'AUDITOR',
    isAdmin: user?.role === 'ADMIN'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}