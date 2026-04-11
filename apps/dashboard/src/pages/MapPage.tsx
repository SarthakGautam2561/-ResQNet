import LiveMap from '../components/map/LiveMap';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';

export default function MapPage() {
  const { reports, loading } = useRealtimeSOS();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        Loading map data...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', padding: 18 }}>
      <LiveMap reports={reports} />
    </div>
  );
}
