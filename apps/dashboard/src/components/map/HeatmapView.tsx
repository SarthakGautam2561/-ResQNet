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

      const points = reports.map((r) => {
        const weight = Math.min(1, Math.max(0.25, Math.pow(r.severity / 5, 1.15)));
        return [r.latitude, r.longitude, weight] as [number, number, number];
      });

      if (points.length > 0 && (L as any).heatLayer) {
        layerRef.current = (L as any)
          .heatLayer(points, {
            radius: 48,
            blur: 32,
            maxZoom: 15,
            minOpacity: 0.35,
            max: 1.0,
            gradient: {
              0.05: '#2b59ff',
              0.25: '#4cc9ff',
              0.45: '#34e2c6',
              0.65: '#ffd166',
              0.8: '#ff8a4c',
              1.0: '#ff3b3b',
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
  const [baseLayer, setBaseLayer] = useState<'dark' | 'streets' | 'satellite' | 'osm'>('streets');
  // Dark-only map styling.

  const visibleReports = useMemo(() => {
    return includeResolved ? reports : reports.filter((r) => r.status !== 'resolved');
  }, [reports, includeResolved]);

  const severityCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    visibleReports.forEach((r) => {
      if (counts[r.severity as 1 | 2 | 3 | 4 | 5] !== undefined) {
        counts[r.severity as 1 | 2 | 3 | 4 | 5] += 1;
      }
    });
    return counts;
  }, [visibleReports]);

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

      <div className="map-heat-legend">
        <div className="map-legend-title">INTENSITY</div>
        <div className="map-heat-bar" />
        <div className="map-heat-labels">
          <span>LOW</span>
          <span>HIGH</span>
        </div>
        <div className="map-heat-counts">
          <span>Critical: {severityCounts[5]}</span>
          <span>High: {severityCounts[4]}</span>
          <span>Moderate+: {severityCounts[3] + severityCounts[2]}</span>
          <span>Low: {severityCounts[1]}</span>
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


