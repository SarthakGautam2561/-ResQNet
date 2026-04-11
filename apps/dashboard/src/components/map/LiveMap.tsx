import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { SOSReport } from '../../hooks/useRealtimeSOS';
import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS } from '@resqnet/shared-types';

function AutoCenter({ reports }: { reports: SOSReport[] }) {
  const map = useMap();
  useEffect(() => {
    if (reports.length > 0) {
      const lat = reports.reduce((s, r) => s + r.latitude, 0) / reports.length;
      const lng = reports.reduce((s, r) => s + r.longitude, 0) / reports.length;
      map.setView([lat, lng], 12, { animate: true });
    }
  }, []);
  return null;
}

interface LiveMapProps {
  reports: SOSReport[];
  onMarkerClick?: (report: SOSReport) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function LiveMap({ reports, onMarkerClick, className, style }: LiveMapProps) {
  const activeReports = reports.filter((r) => r.status !== 'resolved');

  const formatTime = (t: string) => {
    const d = new Date(t);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <div className={className} style={{ width: '100%', height: '100%', ...style }}>
      <MapContainer
        center={[28.6139, 77.2090]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <AutoCenter reports={activeReports} />
        {activeReports.map((report) => (
          <CircleMarker
            key={report.id}
            center={[report.latitude, report.longitude]}
            radius={report.severity >= 4 ? 10 : report.severity >= 3 ? 8 : 6}
            pathOptions={{
              color: SEVERITY_COLORS[report.severity] || '#94a3b8',
              fillColor: SEVERITY_COLORS[report.severity] || '#94a3b8',
              fillOpacity: 0.7,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onMarkerClick?.(report),
            }}
          >
            <Popup>
              <div style={{ minWidth: 200, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[report.category] || '⚠️'}</span>
                  <strong style={{ fontSize: 13 }}>{report.category}</strong>
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  background: SEVERITY_COLORS[report.severity],
                  marginBottom: 6,
                }}>
                  {SEVERITY_LABELS[report.severity]} — Level {report.severity}
                </div>
                {report.message && (
                  <p style={{ fontSize: 12, margin: '4px 0', color: '#e2e8f0', lineHeight: 1.4 }}>
                    {report.message}
                  </p>
                )}
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                  {report.name && <span>👤 {report.name} · </span>}
                  <span>🕐 {formatTime(report.created_at)}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
