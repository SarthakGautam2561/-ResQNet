import SOSFeedTable from '../components/dashboard/SOSFeedTable';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';

export default function ReportsPage() {
  const { reports, loading, updateStatus } = useRealtimeSOS();

  const handleMarkResolved = async (id: string) => {
    await updateStatus(id, 'resolved');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        Loading reports...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(91, 64, 62, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', margin: 0 }}>
            ALL SOS REPORTS
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
            {reports.length} total · {reports.filter(r => r.status === 'pending').length} pending
          </p>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SOSFeedTable reports={reports} onMarkResolved={handleMarkResolved} />
      </div>
    </div>
  );
}
