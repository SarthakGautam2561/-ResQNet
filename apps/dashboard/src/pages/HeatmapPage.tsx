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
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <HeatmapView reports={reports} />

      {/* Overlay legend */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        background: 'rgba(23, 27, 40, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '12px 16px',
        zIndex: 1000,
        fontSize: 11,
        color: '#94a3b8',
      }}>
        <div style={{ fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8, fontSize: 10 }}>
          INCIDENT DENSITY
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 60, height: 8, background: 'linear-gradient(to right, #3b82f6, #06b6d4, #eab308, #f97316, #ef4444)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, fontWeight: 600 }}>
          <span>LOW</span>
          <span>HIGH</span>
        </div>
      </div>

      {/* Title overlay */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '0.1em',
        color: '#94a3b8',
        background: 'rgba(23, 27, 40, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '8px 16px',
      }}>
        HEATMAP — INCIDENT CLUSTERS
      </div>
    </div>
  );
}
