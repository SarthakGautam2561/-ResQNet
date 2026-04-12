import { useMemo, useState } from 'react';
import type { ProcessedSOSReport } from '@resqnet/shared-types';
import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS } from '@resqnet/shared-types';
import './SOSFeedTable.css';

interface ProcessedFeedTableProps {
  reports: ProcessedSOSReport[];
}

const NEED_LABELS: Record<string, string> = {
  food: 'Food',
  water: 'Water',
  doctor: 'Doctor',
  shelter: 'Shelter',
  medicines: 'Medicines',
};

export default function ProcessedFeedTable({ reports }: ProcessedFeedTableProps) {
  const [districtFilter, setDistrictFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const districts = useMemo(
    () => Array.from(new Set(reports.map((r) => r.district).filter(Boolean))) as string[],
    [reports]
  );

  const filtered = reports
    .filter((r) => districtFilter === 'all' || r.district === districtFilter)
    .filter((r) => categoryFilter === 'all' || r.category === categoryFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const formatTime = (t: string) => {
    const d = new Date(t);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h3 className="feed-title">PROCESSED INTEL FEED</h3>
        <div className="feed-filters">
          <select
            className="feed-select"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          >
            <option value="all">All Districts</option>
            {districts.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
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
        </div>
      </div>

      <div className="feed-table-wrap">
        <table className="feed-table">
          <thead>
            <tr>
              <th className="feed-th">TIME</th>
              <th className="feed-th">DISTRICT</th>
              <th className="feed-th feed-th--area">AREA</th>
              <th className="feed-th">CATEGORY</th>
              <th className="feed-th">VERIFIED SEVERITY</th>
              <th className="feed-th">NEEDS</th>
              <th className="feed-th">SUMMARY</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((report) => {
              const needs = (report.supply_requirements || {}) as Record<string, number>;
              const needChips = Object.entries(needs)
                .filter(([, value]) => Number(value) > 0)
                .map(([key, value]) => (
                  <span key={key} className="feed-need">
                    {NEED_LABELS[key] || key} - {value}
                  </span>
                ));

              const verified = report.verified_severity || 0;
              return (
                <tr key={report.id} className={`feed-row ${verified >= 5 ? 'feed-row--critical' : ''}`}>
                  <td className="feed-td feed-td--time">{formatTime(report.created_at)}</td>
                  <td className="feed-td">{report.district || 'Unknown'}</td>
                  <td className="feed-td feed-td--area" title={report.detailed_area || undefined}>
                    {report.detailed_area || '--'}
                  </td>
                  <td className="feed-td">
                    <span className="feed-category">
                      <span>{CATEGORY_ICONS[(report.category as any) || 'Other'] || '!'}</span>
                      <span>{report.category || 'Other'}</span>
                    </span>
                  </td>
                  <td className="feed-td">
                    {verified ? (
                      <span className="feed-severity" style={{ background: SEVERITY_COLORS[verified as any] || '#94a3b8' }}>
                        {verified} - {SEVERITY_LABELS[verified as any] || 'Unknown'}
                      </span>
                    ) : (
                      <span className="feed-td--muted">--</span>
                    )}
                  </td>
                  <td className="feed-td">
                    <div className="feed-needs">
                      {needChips.length > 0 ? needChips : <span className="feed-td--muted">No tagged needs</span>}
                    </div>
                  </td>
                  <td className="feed-td feed-td--message">
                    {report.rephrased_message || report.message || '--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="feed-empty">No processed reports yet</div>
        )}
      </div>
    </div>
  );
}
