import StatsCards from '../components/dashboard/StatsCards';
import SOSFeedTable from '../components/dashboard/SOSFeedTable';
import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';
import LiveMap from '../components/map/LiveMap';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';
import { useAnalytics } from '../hooks/useAnalytics';
import { useProcessedSOS } from '../hooks/useProcessedSOS';
import { useMemo, useState } from 'react';
import './DashboardPage.css';

export default function DashboardPage() {
  const { reports, loading, stats, updateStatus } = useRealtimeSOS();
  const { analytics, loading: analyticsLoading, error: analyticsError } = useAnalytics();
  const { reports: processedReports } = useProcessedSOS();
  const [showIntel, setShowIntel] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'split' | 'map' | 'feed'>('split');

  const detailedAreaById = useMemo(() => {
    const map: Record<string, string> = {};
    processedReports.forEach((report) => {
      if (report.detailed_area) {
        map[report.id] = report.detailed_area;
      }
    });
    return map;
  }, [processedReports]);

  const handleMarkResolved = async (id: string) => {
    await updateStatus(id, 'resolved');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-pulse">◆</div>
        <p>INITIALIZING COMMAND CENTER...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Stats Row */}
      <div className="dashboard-stats">
        <StatsCards
          total={stats.total}
          critical={stats.critical}
          pending={stats.pending}
          resolved={stats.resolved}
          activeZones={stats.activeZones}
        />
      </div>

      <div className="dashboard-intel">
        <div className="dashboard-intel-header">
          <div>
            <span className="intel-title">INTEL SNAPSHOT</span>
            <span className="intel-subtitle">Live processed signals and needs summary</span>
          </div>
          <button className="intel-toggle" onClick={() => setShowIntel((prev) => !prev)}>
            {showIntel ? 'Hide Intel' : 'Show Intel'}
          </button>
        </div>
        {showIntel && (
          <AnalyticsPanel analytics={analytics} loading={analyticsLoading} error={analyticsError} />
        )}
      </div>

      {/* Map + Feed Split */}
      <div className={`dashboard-main dashboard-main--${layoutMode}`}>
        <div className="dashboard-map-section">
          <div className="section-header">
            <span className="section-title">SITUATIONAL AWARENESS MAP</span>
            <div className="section-actions">
              <span className="section-count">{reports.filter(r => r.status !== 'resolved').length} active incidents</span>
              <button
                className="section-action-btn"
                onClick={() => setLayoutMode(layoutMode === 'map' ? 'split' : 'map')}
              >
                {layoutMode === 'map' ? 'Split View' : 'Map Focus'}
              </button>
            </div>
          </div>
          <div className="dashboard-map">
            <LiveMap reports={reports} detailedAreaById={detailedAreaById} />
          </div>
        </div>

        <div className="dashboard-feed-section">
          <SOSFeedTable
            reports={reports}
            onMarkResolved={handleMarkResolved}
            detailedAreaById={detailedAreaById}
            headerAction={
              <button
                className="section-action-btn"
                onClick={() => setLayoutMode(layoutMode === 'feed' ? 'split' : 'feed')}
              >
                {layoutMode === 'feed' ? 'Split View' : 'Feed Focus'}
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
