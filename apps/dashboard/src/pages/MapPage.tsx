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
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <LiveMap reports={reports} />
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
        background: 'rgba(23, 27, 40, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '8px 16px',
      }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8' }}>
          LIVE INCIDENT MAP
        </span>
        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 12 }}>
          {reports.filter(r => r.status !== 'resolved').length} active
        </span>
      </div>

      {/* Severity legend */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        background: 'rgba(23, 27, 40, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#64748b', marginBottom: 2 }}>SEVERITY</div>
        {[
          { color: '#ef4444', label: 'Critical' },
          { color: '#f97316', label: 'High' },
          { color: '#eab308', label: 'Important' },
          { color: '#06b6d4', label: 'Moderate' },
          { color: '#3b82f6', label: 'Low' },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8' }}>
            <div style={{ width: 10, height: 10, background: s.color, borderRadius: '50%' }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
