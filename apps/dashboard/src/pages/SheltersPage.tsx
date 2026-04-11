import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  contact: string | null;
  is_active: boolean;
  created_at: string;
}

export default function SheltersPage() {
  const { user } = useAuth();
  const role = user?.role || 'public';
  const canManageShelters = ['admin', 'official', 'ngo'].includes(role);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canManageShelters) {
      setLoading(false);
      return;
    }
    supabase
      .from('shelters')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setShelters(data);
        setLoading(false);
      });
  }, [canManageShelters]);

  if (!canManageShelters) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        Access restricted to Admin, Official, and NGO roles.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        Loading shelters...
      </div>
    );
  }

  return (
    <div style={{ padding: 20, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', margin: 0 }}>
            SHELTER MANAGEMENT
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
            {shelters.length} registered shelters
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {shelters.map((s) => (
          <div key={s.id} style={{
            background: '#1b1f2c',
            padding: 20,
            borderTop: '1px solid rgba(91,64,62,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#dfe2f3', margin: 0 }}>
                🏠 {s.name}
              </h3>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: s.is_active ? '#22c55e' : '#64748b',
                background: s.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                padding: '2px 8px',
                letterSpacing: '0.05em',
              }}>
                {s.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94a3b8' }}>
              {s.capacity && (
                <span>👥 Capacity: <strong style={{ color: '#dfe2f3' }}>{s.capacity}</strong></span>
              )}
              {s.contact && <span>📞 {s.contact}</span>}
            </div>

            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
              📍 {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
            </div>

            <a
              href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 11,
                color: '#adc6ff',
                fontWeight: 600,
                textDecoration: 'none',
                alignSelf: 'flex-start',
              }}
            >
              Open in Google Maps →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
