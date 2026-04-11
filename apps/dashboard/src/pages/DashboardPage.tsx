import StatsCards from '../components/dashboard/StatsCards';
import SOSFeedTable from '../components/dashboard/SOSFeedTable';
import LiveMap from '../components/map/LiveMap';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';
import './DashboardPage.css';

export default function DashboardPage() {
  const { reports, loading, stats, updateStatus } = useRealtimeSOS();

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

      {/* Map + Feed Split */}
      <div className="dashboard-main">
        <div className="dashboard-map-section">
          <div className="section-header">
            <span className="section-title">SITUATIONAL AWARENESS MAP</span>
            <span className="section-count">{reports.filter(r => r.status !== 'resolved').length} active incidents</span>
          </div>
          <div className="dashboard-map">
            <LiveMap reports={reports} />
          </div>
        </div>

        <div className="dashboard-feed-section">
          <SOSFeedTable
            reports={reports}
            onMarkResolved={handleMarkResolved}
          />
        </div>
      </div>
    </div>
  );
}
