import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SOSReport } from '@resqnet/shared-types';

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
      // Remove old layer
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }

      const points = reports
        .filter((r) => r.status !== 'resolved')
        .map((r) => [r.latitude, r.longitude, r.severity / 5] as [number, number, number]);

      if (points.length > 0 && (L as any).heatLayer) {
        layerRef.current = (L as any)
          .heatLayer(points, {
            radius: 30,
            blur: 20,
            maxZoom: 14,
            max: 1.0,
            gradient: {
              0.2: '#3b82f6',
              0.4: '#06b6d4',
              0.6: '#eab308',
              0.8: '#f97316',
              1.0: '#ef4444',
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
}

export default function HeatmapView({ reports, style }: HeatmapViewProps) {
  return (
    <div style={{ width: '100%', height: '100%', ...style }}>
      <MapContainer
        center={[28.6139, 77.2090]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <HeatLayer reports={reports} />
      </MapContainer>
    </div>
  );
}
