import { useState } from 'react';
import { CheckCircle, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import type { SOSReport } from '../../hooks/useRealtimeSOS';
import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS } from '@resqnet/shared-types';
import { useAuth } from '../../hooks/useAuth';
import './SOSFeedTable.css';
const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308', acknowledged: '#3b82f6', in_progress: '#f97316', resolved: '#22c55e',
};

interface SOSFeedTableProps {
  reports: SOSReport[];
  onMarkResolved?: (id: string) => void;
}

export default function SOSFeedTable({ reports, onMarkResolved }: SOSFeedTableProps) {
  const { user } = useAuth();
  const role = user?.role || 'public';
  const canResolve = ['admin', 'official', 'ngo'].includes(role);
  const [sortField, setSortField] = useState<'created_at' | 'severity'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const formatTime = (t: string) => {
    const d = new Date(t);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString();
  };

  const toggleSort = (field: 'created_at' | 'severity') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = reports
    .filter((r) => categoryFilter === 'all' || r.category === categoryFilter)
    .filter((r) => statusFilter === 'all' || r.status === statusFilter)
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'severity') return (a.severity - b.severity) * mul;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mul;
    });

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field ? (
      sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
    ) : null;

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h3 className="feed-title">LIVE SOS FEED</h3>
        <div className="feed-filters">
          <select
            className="feed-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {Object.keys(CATEGORY_ICONS).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="feed-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="feed-table-wrap">
        <table className="feed-table">
          <thead>
            <tr>
              <th className="feed-th feed-th--sortable" onClick={() => toggleSort('created_at')}>
                TIME <SortIcon field="created_at" />
              </th>
              <th className="feed-th">NAME</th>
              <th className="feed-th">CATEGORY</th>
              <th className="feed-th feed-th--sortable" onClick={() => toggleSort('severity')}>
                SEVERITY <SortIcon field="severity" />
              </th>
              <th className="feed-th">MESSAGE</th>
              <th className="feed-th">STATUS</th>
              <th className="feed-th">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((report, idx) => (
              <tr
                key={report.id}
                className={`feed-row ${idx === 0 ? 'animate-slide-in' : ''} ${report.severity >= 5 ? 'feed-row--critical' : ''}`}
              >
                <td className="feed-td feed-td--time">{formatTime(report.created_at)}</td>
                <td className="feed-td">{report.name || '—'}</td>
                <td className="feed-td">
                  <span className="feed-category">
                    <span>{CATEGORY_ICONS[report.category] || '⚠️'}</span>
                    <span>{report.category}</span>
                  </span>
                </td>
                <td className="feed-td">
                  <span
                    className="feed-severity"
                    style={{ background: SEVERITY_COLORS[report.severity] }}
                  >
                    {report.severity} — {SEVERITY_LABELS[report.severity]}
                  </span>
                </td>
                <td className="feed-td feed-td--message">{report.message || '—'}</td>
                <td className="feed-td">
                  <span
                    className="feed-status"
                    style={{
                      color: STATUS_COLORS[report.status] || '#94a3b8',
                      borderColor: STATUS_COLORS[report.status] || '#94a3b8',
                    }}
                  >
                    {report.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="feed-td feed-td--actions">
                  {report.status !== 'resolved' && canResolve && (
                    <>
                      <button
                        className="feed-action feed-action--resolve"
                        onClick={() => onMarkResolved?.(report.id)}
                        title="Mark Resolved"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <a
                        className="feed-action feed-action--navigate"
                        href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Navigate"
                      >
                        <Navigation size={14} />
                      </a>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="feed-empty">No reports matching filters</div>
        )}
      </div>
    </div>
  );
}
