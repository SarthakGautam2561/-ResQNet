import type { DisasterAnalytics } from '@resqnet/shared-types';
import './AnalyticsPanel.css';

interface AnalyticsPanelProps {
  analytics: DisasterAnalytics[];
  loading: boolean;
  error?: string | null;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'No data';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function coerceNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export default function AnalyticsPanel({ analytics, loading, error }: AnalyticsPanelProps) {
  const latestDate = analytics[0]?.date_bucket;
  const latest = latestDate ? analytics.filter((a) => a.date_bucket === latestDate) : [];
  const totalIncidents = latest.reduce((sum, item) => sum + coerceNumber(item.total_incidents), 0);
  const totalSeverity = latest.reduce(
    (sum, item) => sum + coerceNumber(item.avg_severity) * coerceNumber(item.total_incidents || 0),
    0
  );
  const avgSeverity = totalIncidents ? totalSeverity / totalIncidents : 0;

  const needsAgg: Record<string, number> = {
    food: 0,
    water: 0,
    doctor: 0,
    shelter: 0,
    medicines: 0,
  };

  latest.forEach((item) => {
    const needs = (item.critical_needs || {}) as Record<string, number>;
    Object.keys(needsAgg).forEach((key) => {
      needsAgg[key] += coerceNumber(needs[key]);
    });
  });

  const topNeeds = Object.entries(needsAgg)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const maxIncidents = Math.max(1, ...latest.map((item) => coerceNumber(item.total_incidents)));

  return (
    <div className="analytics-panel">
      <div className="analytics-header">
        <div>
          <div className="analytics-title">INTEL SNAPSHOT</div>
          <div className="analytics-date">DATE: {formatDate(latestDate)}</div>
        </div>
        <div className={`analytics-status ${loading ? 'is-loading' : ''}`}>
          {loading ? 'SYNCING...' : 'LIVE'}
        </div>
      </div>

      {error && (
        <div className="analytics-error">
          Analytics unavailable: {error}
        </div>
      )}

      {!error && latest.length === 0 && !loading && (
        <div className="analytics-empty">No analytics data yet. Incoming SOS will auto-generate intel.</div>
      )}

      {!error && latest.length > 0 && (
        <div className="analytics-body">
          <div className="analytics-kpis">
            <div className="analytics-kpi">
              <span className="analytics-kpi-value">{totalIncidents}</span>
              <span className="analytics-kpi-label">INCIDENTS</span>
            </div>
            <div className="analytics-kpi">
              <span className="analytics-kpi-value">{avgSeverity.toFixed(1)}</span>
              <span className="analytics-kpi-label">AVG SEVERITY</span>
            </div>
            <div className="analytics-kpi">
              <span className="analytics-kpi-value">{topNeeds[0]?.[0] ? topNeeds[0][0].toUpperCase() : 'NONE'}</span>
              <span className="analytics-kpi-label">TOP NEED</span>
            </div>
          </div>
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-card-title">DISTRICT PRIORITY</div>
              <div className="analytics-districts">
                {latest.slice(0, 5).map((item) => {
                  const incidents = coerceNumber(item.total_incidents);
                  const width = Math.round((incidents / maxIncidents) * 100);
                  return (
                    <div key={item.id} className="analytics-district">
                      <div className="analytics-district-row">
                        <span className="analytics-district-name" title={item.district}>{item.district}</span>
                        <span className="analytics-district-count">{incidents}</span>
                      </div>
                      <div className="analytics-bar">
                        <div className="analytics-bar-fill" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="analytics-card analytics-card--needs">
              <div className="analytics-card-title">CRITICAL NEEDS</div>
              <div className="analytics-needs">
                {topNeeds.length === 0 && <span className="analytics-muted">No urgent needs tagged.</span>}
                {topNeeds.map(([key, value]) => (
                  <div key={key} className="analytics-need">
                    <span className="analytics-need-label">{key.toUpperCase()}</span>
                    <span className="analytics-need-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="analytics-summary">
                {latest[0]?.overall_summary || 'Live summaries will appear once processing data flows in.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
