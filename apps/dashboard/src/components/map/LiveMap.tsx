import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SOSReport } from '../../hooks/useRealtimeSOS';
import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS } from '@resqnet/shared-types';
import './MapStyles.css';

function AutoCenter({ points, follow }: { points: [number, number][]; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!follow) return;
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.25), { animate: true });
  }, [follow, map, points]);
  return null;
}

interface LiveMapProps {
  reports: SOSReport[];
  onMarkerClick?: (report: SOSReport) => void;
  detailedAreaById?: Record<string, string | null | undefined>;
  className?: string;
  style?: React.CSSProperties;
}

export default function LiveMap({ reports, onMarkerClick, detailedAreaById, className, style }: LiveMapProps) {
  const [follow, setFollow] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [baseLayer, setBaseLayer] = useState<'dark' | 'streets' | 'satellite' | 'osm'>('streets');
  const [expandedClusters, setExpandedClusters] = useState<string[]>([]);
  const [recentReports, setRecentReports] = useState<Record<string, number>>({});
  const previousIdsRef = useRef<Set<string> | null>(null);
  // Dark-only map styling.

  useEffect(() => {
    const currentIds = new Set(reports.map((r) => r.id));
    if (!previousIdsRef.current) {
      previousIdsRef.current = currentIds;
      return;
    }
    const newIds = Array.from(currentIds).filter((id) => !previousIdsRef.current?.has(id));
    if (newIds.length > 0) {
      const now = Date.now();
      setRecentReports((prev) => {
        const next = { ...prev };
        newIds.forEach((id) => {
          next[id] = now;
        });
        return next;
      });
      newIds.forEach((id) => {
        setTimeout(() => {
          setRecentReports((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 8000);
      });
    }
    previousIdsRef.current = currentIds;
  }, [reports]);
  const visibleReports = useMemo(() => {
    return showResolved ? reports : reports.filter((r) => r.status !== 'resolved');
  }, [reports, showResolved]);

    const groupedReports = useMemo(() => {
    const groups = new Map<string, SOSReport[]>();
    visibleReports.forEach((report) => {
      const key = `${report.latitude},${report.longitude}`;
      const list = groups.get(key) ?? [];
      list.push(report);
      groups.set(key, list);
    });
    return groups;
  }, [visibleReports]);

  const plottedReports = useMemo(() => {
    const plotted: Array<
      | { type: 'report'; report: SOSReport; lat: number; lng: number; stackSize: number }
      | { type: 'cluster'; clusterKey: string; lat: number; lng: number; count: number }
    > = [];
    groupedReports.forEach((list, key) => {
      if (list.length === 1 || expandedClusters.includes(key)) {
        if (list.length === 1) {
          plotted.push({
            type: 'report',
            report: list[0],
            lat: list[0].latitude,
            lng: list[0].longitude,
            stackSize: 1,
          });
          return;
        }
        const baseRadius = 0.0007;
        list.forEach((report, index) => {
          const angle = (index / list.length) * Math.PI * 2;
          const spread = baseRadius + 0.0001 * (index % 3);
          plotted.push({
            type: 'report',
            report,
            lat: report.latitude + Math.cos(angle) * spread,
            lng: report.longitude + Math.sin(angle) * spread,
            stackSize: list.length,
          });
        });
      } else {
        plotted.push({
          type: 'cluster',
          clusterKey: key,
          lat: list[0].latitude,
          lng: list[0].longitude,
          count: list.length,
        });
      }
    });
    return plotted;
  }, [groupedReports, expandedClusters]);

  const activeReports = useMemo(
    () => visibleReports.filter((r) => r.status !== 'resolved'),
    [visibleReports]
  );

  const criticalCount = activeReports.filter((r) => r.severity >= 4).length;

  const plottedPoints = useMemo(() => {
    return plottedReports
      .filter((item) => item.type === 'report')
      .map((item) => [item.lat, item.lng] as [number, number]);
  }, [plottedReports]);

  const severityCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    visibleReports.forEach((r) => {
      if (counts[r.severity as 1 | 2 | 3 | 4 | 5] !== undefined) {
        counts[r.severity as 1 | 2 | 3 | 4 | 5] += 1;
      }
    });
    return counts;
  }, [visibleReports]);

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
        {baseLayer === 'dark' && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            className="map-tiles map-tiles--base"
          />
        )}
        {baseLayer === 'streets' && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            className="map-tiles map-tiles--base"
          />
        )}
        {baseLayer === 'osm' && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-tiles map-tiles--base"
          />
        )}
        {baseLayer === 'satellite' && (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              className="map-tiles map-tiles--base"
            />
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution=" "
              className="map-tiles map-tiles--labels"
            />
          </>
        )}
        <AutoCenter points={plottedPoints} follow={follow} />
                {plottedReports.map((item) => {
          if (item.type === 'cluster') {
            const radius = Math.min(22, 10 + item.count * 2);
            return (
              <CircleMarker
                key={`cluster-${item.clusterKey}`}
                center={[item.lat, item.lng]}
                radius={radius}
                pathOptions={{
                  color: '#7dd3fc',
                  fillColor: '#0ea5e9',
                  fillOpacity: 0.55,
                  weight: 2,
                  className: 'map-cluster',
                }}
                eventHandlers={{
                  click: () => {
                    setExpandedClusters((prev) =>
                      prev.includes(item.clusterKey) ? prev : [...prev, item.clusterKey]
                    );
                  },
                }}
              >
                <Tooltip permanent direction="center" className="map-cluster-label">
                  {item.count}
                </Tooltip>
              </CircleMarker>
            );
          }

          const { report, lat, lng, stackSize } = item;
          const color = SEVERITY_COLORS[report.severity] || '#94a3b8';
          const isFresh = recentReports[report.id] && Date.now() - recentReports[report.id] < 8000;
          return (
            <Fragment key={report.id}>
              {isFresh && (
                <CircleMarker
                  key={`${report.id}-shock`}
                  center={[lat, lng]}
                  radius={report.severity >= 4 ? 20 : 16}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.05,
                    weight: 1,
                    className: 'map-shockwave',
                  }}
                  interactive={false}
                />
              )}
              {report.severity >= 4 && (
                <CircleMarker
                  key={`${report.id}-beacon`}
                  center={[lat, lng]}
                  radius={report.severity >= 5 ? 26 : 22}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.08,
                    weight: 1,
                    className: 'map-beacon',
                  }}
                  interactive={false}
                />
              )}
              <CircleMarker
                key={`${report.id}-halo`}
                center={[lat, lng]}
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
                center={[lat, lng]}
                radius={report.severity >= 4 ? 10 : report.severity >= 3 ? 8 : 6}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: report.status === 'resolved' ? 0.3 : 0.8,
                  weight: 2,
                  className: 'map-dot',
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
                    {detailedAreaById?.[report.id] && (
                      <div className="map-popup-area">
                        <span>Area:</span> {detailedAreaById[report.id]}
                      </div>
                    )}
                    {stackSize > 1 && (
                      <div className="map-popup-area">
                        <span>Stack:</span> {stackSize} reports in this spot
                      </div>
                    )}
                    {report.message && <p className="map-popup-message">{report.message}</p>}
                    <div className="map-popup-meta">
                      {report.name && <span>👤 {report.name} · </span>}
                      <span>🕐 {formatTime(report.created_at)}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </Fragment>
          );
        })}
      </MapContainer>

      <div className="map-overlay">
        <div className="map-panel">
          <div className="map-title">LIVE INCIDENT MAP</div>
          <div className="map-subtitle">
            {activeReports.length} active · {criticalCount} critical · {visibleReports.length} visible
          </div>
        </div>

        <div className="map-panel map-actions">
          <button type="button" onClick={() => setShowResolved((prev) => !prev)}>
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </button>
          <button type="button" onClick={() => setFollow((prev) => !prev)}>
            {follow ? 'Follow: On' : 'Follow: Off'}
          </button>
          {expandedClusters.length > 0 && (
            <button type="button" onClick={() => setExpandedClusters([])}>
              Collapse Clusters
            </button>
          )}
          <div className="map-layer-toggle" role="group" aria-label="Map style">
            {[
              { id: 'streets', label: 'Streets' },
              { id: 'osm', label: 'OSM' },
              { id: 'dark', label: 'Dark' },
              { id: 'satellite', label: 'Satellite' },
            ].map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={baseLayer === layer.id ? 'is-active' : ''}
                onClick={() => setBaseLayer(layer.id as 'dark' | 'streets' | 'satellite' | 'osm')}
              >
                {layer.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="map-legend">
        <div className="map-legend-title">SEVERITY</div>
        {[
          { color: '#ff5b5b', label: 'Critical', count: severityCounts[5] },
          { color: '#ff8a4c', label: 'High', count: severityCounts[4] },
          { color: '#ffd166', label: 'Important', count: severityCounts[3] },
          { color: '#4cc9ff', label: 'Moderate', count: severityCounts[2] },
          { color: '#6a8cff', label: 'Low', count: severityCounts[1] },
        ].map((item) => (
          <div key={item.label} className="map-legend-item">
            <span className="map-legend-dot" style={{ background: item.color }} />
            <span>
              {item.label} · {item.count}
            </span>
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
            if (!mapRef || plottedPoints.length === 0) return;
            const bounds = L.latLngBounds(plottedPoints);
            mapRef.fitBounds(bounds.pad(0.25), { animate: true });
          }}
        >
          o
        </button>
      </div>
    </div>
  );
}












