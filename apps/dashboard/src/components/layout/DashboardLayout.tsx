import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Flame,
  FileText,
  Building2,
  LogOut,
  Globe,
  LineChart,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const role = user?.role || 'public';
  const canManageShelters = ['admin', 'official', 'ngo'].includes(role);

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">◆</span>
            <span className="logo-text">RESQNET</span>
          </div>
          <span className="logo-subtitle">COMMAND CENTER</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Map size={18} />
            <span>Live Map</span>
          </NavLink>
          <NavLink to="/heatmap" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Flame size={18} />
            <span>Heatmap</span>
          </NavLink>
          <NavLink to="/intel" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <LineChart size={18} />
            <span>Intel</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <FileText size={18} />
            <span>Reports</span>
          </NavLink>
          {canManageShelters && (
            <NavLink to="/shelters" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
              <Building2 size={18} />
              <span>Shelters</span>
            </NavLink>
          )}
          <NavLink to="/public" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Globe size={18} />
            <span>Public View</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              <div className="user-avatar">{(user.name || user.email || 'U')[0].toUpperCase()}</div>
              <div className="user-details">
                <span className="user-name">{user.name || user.email}</span>
                <span className="user-role">{user.role.toUpperCase()}</span>
              </div>
              <button className="logout-btn" onClick={logout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
