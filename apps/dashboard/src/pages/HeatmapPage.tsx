import HeatmapView from '../components/map/HeatmapView';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';

export default function HeatmapPage() {
  const { reports, loading } = useRealtimeSOS();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        Loading heatmap data...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', padding: 18 }}>
      <HeatmapView reports={reports} />
    </div>
  );
}
