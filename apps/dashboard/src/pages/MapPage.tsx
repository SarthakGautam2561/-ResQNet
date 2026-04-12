import LiveMap from '../components/map/LiveMap';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';
import { useProcessedSOS } from '../hooks/useProcessedSOS';
import { useMemo } from 'react';

export default function MapPage() {
  const { reports, loading } = useRealtimeSOS();
  const { reports: processedReports } = useProcessedSOS();

  const detailedAreaById = useMemo(() => {
    const map: Record<string, string> = {};
    processedReports.forEach((report) => {
      if (report.detailed_area) {
        map[report.id] = report.detailed_area;
      }
    });
    return map;
  }, [processedReports]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        Loading map data...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', padding: 18 }}>
      <LiveMap reports={reports} detailedAreaById={detailedAreaById} />
    </div>
  );
}
