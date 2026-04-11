import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import type { SOSReport, SOSStatus } from '@resqnet/shared-types';
export type { SOSReport };

export function useRealtimeSOS() {
  const [reports, setReports] = useState<SOSReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setReports([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('sos_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReports(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();

    // Realtime subscription
    if (!supabase || !isSupabaseConfigured) {
      return;
    }
    const channel = supabase
      .channel('sos-realtime-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_reports' },
        (payload) => {
          setReports((prev) => [payload.new as SOSReport, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_reports' },
        (payload) => {
          setReports((prev) =>
            prev.map((r) => (r.id === (payload.new as SOSReport).id ? (payload.new as SOSReport) : r))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  // Computed stats
  const stats = {
    total: reports.length,
    critical: reports.filter((r) => r.severity === 5).length,
    pending: reports.filter((r) => r.status === 'pending').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    activeZones: new Set(
      reports
        .filter((r) => r.status !== 'resolved')
        .map((r) => `${Math.round(r.latitude * 100)},${Math.round(r.longitude * 100)}`)
    ).size,
  };

  // Update status
  const updateStatus = async (reportId: string, status: SOSStatus) => {
    if (!supabase || !isSupabaseConfigured) return false;
    const { error } = await supabase
      .from('sos_reports')
      .update({ status })
      .eq('id', reportId);
    return !error;
  };

  return { reports, loading, stats, updateStatus, refetch: fetchReports };
}
