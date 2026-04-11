import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SOSReport } from '../../hooks/useRealtimeSOS';
import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS } from '@resqnet/shared-types';
import './MapStyles.css';

function AutoCenter({ reports, follow }: { reports: SOSReport[]; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!follow) return;
    if (reports.length === 0) return;
    const bounds = L.latLngBounds(reports.map((r) => [r.latitude, r.longitude]));
    map.fitBounds(bounds.pad(0.25), { animate: true });
  }, [follow, map, reports]);
  return null;
}

interface LiveMapProps {
  reports: SOSReport[];
  onMarkerClick?: (report: SOSReport) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function LiveMap({ reports, onMarkerClick, className, style }: LiveMapProps) {
  const [follow, setFollow] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [tileMode, setTileMode] = useState<'dark' | 'light'>('dark');

  const visibleReports = useMemo(() => {
    return showResolved ? reports : reports.filter((r) => r.status !== 'resolved');
  }, [reports, showResolved]);

  const activeReports = useMemo(
    () => visibleReports.filter((r) => r.status !== 'resolved'),
    [visibleReports]
  );

  const criticalCount = activeReports.filter((r) => r.severity >= 4).length;

  const formatTime = (t: string) => {
    const d = new Date(t);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <div className={`map-shell ${className || ''}`} style={{ width: '100%', height: '100%', ...style }}>
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        whenCreated={setMapRef}
      >
        {tileMode === 'dark' ? (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            className="map-tiles map-tiles--dark"
          />
        ) : (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            className="map-tiles map-tiles--light"
          />
        )}
        <AutoCenter reports={activeReports} follow={follow} />
        {visibleReports.map((report) => {
          const color = SEVERITY_COLORS[report.severity] || '#94a3b8';
          return (
            <div key={report.id}>
              <CircleMarker
                key={`${report.id}-halo`}
                center={[report.latitude, report.longitude]}
                radius={report.severity >= 4 ? 16 : report.severity >= 3 ? 13 : 10}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.15,
                  weight: 1,
                  className: 'map-pulse',
                }}
                interactive={false}
              />
              <CircleMarker
                key={report.id}
                center={[report.latitude, report.longitude]}
                radius={report.severity >= 4 ? 10 : report.severity >= 3 ? 8 : 6}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: report.status === 'resolved' ? 0.3 : 0.8,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => onMarkerClick?.(report),
                }}
              >
                <Popup className="map-popup">
                  <div className="map-popup-content">
                    <div className="map-popup-title">
                      <span className="map-popup-icon">{CATEGORY_ICONS[report.category] || '⚠️'}</span>
                      <strong>{report.category}</strong>
                    </div>
                    <div className="map-popup-severity" style={{ background: color }}>
                      {SEVERITY_LABELS[report.severity]} - Level {report.severity}
                    </div>
                    {report.message && <p className="map-popup-message">{report.message}</p>}
                    <div className="map-popup-meta">
                      {report.name && <span>👤 {report.name} · </span>}
                      <span>🕐 {formatTime(report.created_at)}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </div>
          );
        })}
      </MapContainer>

      <div className="map-overlay">
        <div className="map-panel">
          <div className="map-title">LIVE INCIDENT MAP</div>
          <div className="map-subtitle">{activeReports.length} active · {criticalCount} critical</div>
        </div>

        <div className="map-panel map-actions">
          <button type="button" onClick={() => setShowResolved((prev) => !prev)}>
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </button>
          <button type="button" onClick={() => setFollow((prev) => !prev)}>
            {follow ? 'Follow: On' : 'Follow: Off'}
          </button>
          <button type="button" onClick={() => setTileMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}>
            Map: {tileMode === 'dark' ? 'Night' : 'Day'}
          </button>
        </div>
      </div>

      <div className="map-legend">
        <div className="map-legend-title">SEVERITY</div>
        {[
          { color: '#ff5b5b', label: 'Critical' },
          { color: '#ff8a4c', label: 'High' },
          { color: '#ffd166', label: 'Important' },
          { color: '#4cc9ff', label: 'Moderate' },
          { color: '#6a8cff', label: 'Low' },
        ].map((item) => (
          <div key={item.label} className="map-legend-item">
            <span className="map-legend-dot" style={{ background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="map-controls">
        <button type="button" onClick={() => mapRef?.zoomIn()}>
          +
        </button>
        <button type="button" onClick={() => mapRef?.zoomOut()}>
          -
        </button>
        <button
          type="button"
          onClick={() => {
            if (!mapRef || activeReports.length === 0) return;
            const bounds = L.latLngBounds(activeReports.map((r) => [r.latitude, r.longitude]));
            mapRef.fitBounds(bounds.pad(0.25), { animate: true });
          }}
        >
          o
        </button>
      </div>
    </div>
  );
}
