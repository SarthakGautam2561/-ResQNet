import { useMemo, useState } from 'react';
import SOSFeedTable from '../components/dashboard/SOSFeedTable';
import ProcessedFeedTable from '../components/dashboard/ProcessedFeedTable';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';
import { useProcessedSOS } from '../hooks/useProcessedSOS';
import './ReportsPage.css';

export default function ReportsPage() {
  const { reports, loading, updateStatus } = useRealtimeSOS();
  const { reports: processedReports, loading: processedLoading, error: processedError } = useProcessedSOS();
  const [view, setView] = useState<'raw' | 'processed'>('raw');

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

  const activeLoading = view === 'raw' ? loading : processedLoading;

  if (activeLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        Loading reports...
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h2 className="reports-title">
            {view === 'raw' ? 'ALL SOS REPORTS' : 'PROCESSED INTELLIGENCE'}
          </h2>
          <p className="reports-subtitle">
            {view === 'raw'
              ? `${reports.length} total | ${reports.filter(r => r.status === 'pending').length} pending`
              : `${processedReports.length} processed | auto-classified`}
          </p>
        </div>
        <div className="reports-tabs">
          <button
            className={`reports-tab ${view === 'raw' ? 'active' : ''}`}
            onClick={() => setView('raw')}
          >
            Raw Feed
          </button>
          <button
            className={`reports-tab ${view === 'processed' ? 'active' : ''}`}
            onClick={() => setView('processed')}
          >
            Processed Intel
          </button>
        </div>
      </div>
      <div className="reports-body">
        {view === 'raw' && (
          <SOSFeedTable reports={reports} onMarkResolved={handleMarkResolved} detailedAreaById={detailedAreaById} />
        )}
        {view === 'processed' && (
          <>
            {processedError && (
              <div className="reports-error">
                Processed data unavailable: {processedError}
              </div>
            )}
            {!processedError && <ProcessedFeedTable reports={processedReports} />}
          </>
        )}
      </div>
    </div>
  );
}
