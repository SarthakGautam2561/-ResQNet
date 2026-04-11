import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';
import ProcessedFeedTable from '../components/dashboard/ProcessedFeedTable';
import { useAnalytics } from '../hooks/useAnalytics';
import { useProcessedSOS } from '../hooks/useProcessedSOS';
import './IntelPage.css';

export default function IntelPage() {
  const { analytics, loading, error } = useAnalytics();
  const { reports: processedReports, loading: processedLoading, error: processedError } = useProcessedSOS();

  return (
    <div className="intel-page">
      <div className="intel-page-header">
        <div>
          <h2>INTELLIGENCE CENTER</h2>
          <p>Processed signals, district priority, and operational insights.</p>
        </div>
      </div>

      <div className="intel-page-grid">
        <div className="intel-panel">
          <AnalyticsPanel analytics={analytics} loading={loading} error={error} />
        </div>

        <div className="intel-feed">
          {processedLoading && (
            <div className="intel-loading">Loading processed intel...</div>
          )}
          {processedError && (
            <div className="intel-error">Processed intel unavailable: {processedError}</div>
          )}
          {!processedLoading && !processedError && (
            <ProcessedFeedTable reports={processedReports} />
          )}
        </div>
      </div>
    </div>
  );
}
