import { useState, useEffect, useCallback } from 'react';
import HeatmapView from '../components/map/HeatmapView';
import { supabase } from '../services/supabase';
import type { SOSReport } from '@resqnet/shared-types';

type PublicSOSReport = Pick<
  SOSReport,
  'id' | 'created_at' | 'latitude' | 'longitude' | 'category' | 'severity' | 'message' | 'status'
>;

interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  contact: string | null;
}

export default function PublicPage() {
  const [reports, setReports] = useState<PublicSOSReport[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [view, setView] = useState<'heatmap' | 'shelters' | 'alerts'>('heatmap');

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from('sos_reports')
      .select('id, created_at, latitude, longitude, category, severity, message, status')
      .order('created_at', { ascending: false });
    if (data) setReports(data as PublicSOSReport[]);
  }, []);

  const fetchShelters = useCallback(async () => {
    const { data } = await supabase
      .from('shelters')
      .select('*')
      .eq('is_active', true);
    if (data) setShelters(data);
  }, []);

  useEffect(() => {
    fetchReports();
    fetchShelters();

    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, [fetchReports, fetchShelters]);

  const criticalCount = reports.filter((r) => r.severity >= 4 && r.status !== 'resolved').length;

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#0a0e1a' }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: '#0f131f',
        borderBottom: '1px solid rgba(91,64,62,0.1)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#ff5451', fontSize: 18, fontWeight: 900 }}>◆</span>
          <span style={{ color: '#ffb3ad', fontSize: 16, fontWeight: 900, letterSpacing: '0.1em' }}>RESQNET</span>
          <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', marginLeft: 4 }}>PUBLIC VIEW</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {['heatmap', 'shelters', 'alerts'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              style={{
                background: view === v ? 'rgba(255,84,81,0.15)' : 'transparent',
                border: view === v ? '1px solid #ff5451' : '1px solid #313442',
                color: view === v ? '#ffb3ad' : '#94a3b8',
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {criticalCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(147,0,10,0.2)',
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 700,
            color: '#ef4444',
          }}>
            <span style={{ animation: 'pulse-critical 2s infinite' }}>●</span>
            {criticalCount} CRITICAL ALERTS
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        {view === 'heatmap' && <HeatmapView reports={reports} />}

        {view === 'shelters' && (
          <div style={{ padding: 20, overflow: 'auto', height: '100%' }}>
            <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 16 }}>
              EMERGENCY SHELTERS & HELP CENTERS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {shelters.map((s) => (
                <div key={s.id} style={{
                  background: '#1b1f2c',
                  padding: 16,
                  borderTop: '1px solid rgba(91,64,62,0.15)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#dfe2f3', marginBottom: 4 }}>🏠 {s.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {s.capacity && <span>Capacity: {s.capacity} · </span>}
                    {s.contact && <span>📞 {s.contact}</span>}
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 11, color: '#adc6ff', fontWeight: 600, textDecoration: 'none', marginTop: 8, display: 'inline-block' }}
                  >
                    📍 Navigate →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'alerts' && (
          <div style={{ padding: 20, overflow: 'auto', height: '100%' }}>
            <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 16 }}>
              RECENT CRITICAL ALERTS
            </h2>
            {reports
              .filter((r) => r.severity >= 4)
              .slice(0, 20)
              .map((r) => (
                <div key={r.id} style={{
                  background: r.severity === 5 ? 'rgba(147,0,10,0.08)' : '#1b1f2c',
                  padding: 14,
                  marginBottom: 8,
                  borderLeft: `3px solid ${r.severity === 5 ? '#ef4444' : '#f97316'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#dfe2f3' }}>{r.category}</span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>
                      {new Date(r.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {r.message && <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{r.message}</p>}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
