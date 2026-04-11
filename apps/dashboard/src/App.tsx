import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import HeatmapPage from './pages/HeatmapPage';
import ReportsPage from './pages/ReportsPage';
import SheltersPage from './pages/SheltersPage';
import LoginPage from './pages/LoginPage';
import PublicPage from './pages/PublicPage';
import IntelPage from './pages/IntelPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0e1a',
        color: '#64748b',
        fontSize: 12,
        letterSpacing: '0.15em',
        fontWeight: 700,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, color: '#ff5451', marginBottom: 16, animation: 'pulse-critical 1.5s infinite' }}>◆</div>
          AUTHENTICATING...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public" element={<PublicPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/intel" element={<IntelPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/shelters" element={<SheltersPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
