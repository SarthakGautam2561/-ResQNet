import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import type { DisasterAnalytics } from '@resqnet/shared-types';

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<DisasterAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setAnalytics([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('disaster_analytics')
      .select('*')
      .order('date_bucket', { ascending: false })
      .order('total_incidents', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setAnalytics([]);
    } else {
      setError(null);
      setAnalytics((data || []) as DisasterAnalytics[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnalytics();

    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel('analytics-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'disaster_analytics' },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'disaster_analytics' },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnalytics]);

  return { analytics, loading, error, refetch: fetchAnalytics };
}
