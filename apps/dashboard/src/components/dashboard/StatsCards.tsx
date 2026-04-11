import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  MapPin,
  Clock,
} from 'lucide-react';
import './StatsCards.css';

interface StatsCardsProps {
  total: number;
  critical: number;
  pending: number;
  resolved: number;
  activeZones: number;
}

export default function StatsCards({ total, critical, pending, resolved, activeZones }: StatsCardsProps) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon-wrap">
          <Activity size={20} className="stat-icon" />
        </div>
        <div className="stat-data">
          <span className="stat-value">{total}</span>
          <span className="stat-label">TOTAL SOS TODAY</span>
        </div>
      </div>

      <div className="stat-card stat-card--critical">
        <div className="stat-icon-wrap stat-icon-wrap--critical">
          <AlertTriangle size={20} className="stat-icon" />
        </div>
        <div className="stat-data">
          <span className="stat-value stat-value--critical">{critical}</span>
          <span className="stat-label">CRITICAL CASES</span>
        </div>
        {critical > 0 && <div className="stat-pulse" />}
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrap stat-icon-wrap--zones">
          <MapPin size={20} className="stat-icon" />
        </div>
        <div className="stat-data">
          <span className="stat-value">{activeZones}</span>
          <span className="stat-label">ACTIVE ZONES</span>
        </div>
      </div>

      <div className="stat-card stat-card--pending">
        <div className="stat-icon-wrap stat-icon-wrap--pending">
          <Clock size={20} className="stat-icon" />
        </div>
        <div className="stat-data">
          <span className="stat-value stat-value--pending">{pending}</span>
          <span className="stat-label">PENDING REPORTS</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrap stat-icon-wrap--resolved">
          <CheckCircle2 size={20} className="stat-icon" />
        </div>
        <div className="stat-data">
          <span className="stat-value stat-value--resolved">{resolved}</span>
          <span className="stat-label">RESOLVED</span>
        </div>
      </div>
    </div>
  );
}
