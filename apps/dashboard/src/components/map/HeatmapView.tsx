import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SOSReport } from '@resqnet/shared-types';
import './MapStyles.css';

type HeatmapReport = Pick<SOSReport, 'latitude' | 'longitude' | 'severity' | 'status'>;

// We load leaflet.heat dynamically since it has no proper es module export
function loadHeatPlugin(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((L as any).heatLayer) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load leaflet.heat'));
    document.head.appendChild(script);
  });
}

function HeatLayer({ reports }: { reports: HeatmapReport[] }) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    loadHeatPlugin().then(() => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }

      const points = reports.map((r) => [r.latitude, r.longitude, r.severity / 5] as [number, number, number]);

      if (points.length > 0 && (L as any).heatLayer) {
        layerRef.current = (L as any)
          .heatLayer(points, {
            radius: 35,
            blur: 25,
            maxZoom: 14,
            max: 1.0,
            gradient: {
              0.1: '#6a8cff',
              0.35: '#4cc9ff',
              0.6: '#ffd166',
              0.8: '#ff8a4c',
              1.0: '#ff5b5b',
            },
          })
          .addTo(map);
      }
    });

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, reports]);

  return null;
}

interface HeatmapViewProps {
  reports: HeatmapReport[];
  style?: React.CSSProperties;
  className?: string;
}

export default function HeatmapView({ reports, style, className }: HeatmapViewProps) {
  const [includeResolved, setIncludeResolved] = useState(false);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

  const visibleReports = useMemo(() => {
    return includeResolved ? reports : reports.filter((r) => r.status !== 'resolved');
  }, [reports, includeResolved]);

  return (
    <div className={`map-shell ${className || ''}`} style={{ width: '100%', height: '100%', ...style }}>
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        whenCreated={setMapRef}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          className="map-tiles"
        />
        <HeatLayer reports={visibleReports} />
      </MapContainer>

      <div className="map-overlay">
        <div className="map-panel">
          <div className="map-title">HEATMAP - INCIDENT CLUSTERS</div>
          <div className="map-subtitle">{visibleReports.length} signals plotted</div>
        </div>

        <div className="map-panel map-actions">
          <button type="button" onClick={() => setIncludeResolved((prev) => !prev)}>
            {includeResolved ? 'Hide Resolved' : 'Show Resolved'}
          </button>
        </div>
      </div>

      <div className="map-heat-legend">
        <div className="map-legend-title">INTENSITY</div>
        <div className="map-heat-bar" />
        <div className="map-heat-labels">
          <span>LOW</span>
          <span>HIGH</span>
        </div>
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
            if (!mapRef || visibleReports.length === 0) return;
            const bounds = L.latLngBounds(visibleReports.map((r) => [r.latitude, r.longitude]));
            mapRef.fitBounds(bounds.pad(0.25), { animate: true });
          }}
        >
          o
        </button>
      </div>
    </div>
  );
}
