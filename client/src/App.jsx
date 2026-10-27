import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';

// Pages
import { Dashboard } from './pages/Dashboard';
import { BatchExecution } from './pages/BatchExecution';
import { BatchDetail } from './pages/BatchDetail';
import { Materials } from './pages/Materials';
import { QualityLab } from './pages/QualityLab';
import { Deviations } from './pages/Deviations';
import { AuditorPortal } from './pages/AuditorPortal';
import { AdminPanel } from './pages/AdminPanel';
import { Login } from './pages/Login';

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pulse-dot emerald"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Navbar />
      {children}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/execution"
            element={
              <ProtectedLayout>
                <BatchExecution />
              </ProtectedLayout>
            }
          />
          <Route
            path="/batches/:id"
            element={
              <ProtectedLayout>
                <BatchDetail />
              </ProtectedLayout>
            }
          />
          <Route
            path="/materials"
            element={
              <ProtectedLayout>
                <Materials />
              </ProtectedLayout>
            }
          />
          <Route
            path="/qc"
            element={
              <ProtectedLayout>
                <QualityLab />
              </ProtectedLayout>
            }
          />
          <Route
            path="/deviations"
            element={
              <ProtectedLayout>
                <Deviations />
              </ProtectedLayout>
            }
          />
          <Route
            path="/auditor"
            element={
              <ProtectedLayout>
                <AuditorPortal />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedLayout>
                <AdminPanel />
              </ProtectedLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
