import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSupabaseClient } from '../services/supabase';
import { SOS_CATEGORIES, SEVERITY_LEVELS } from '../constants/categories';
import type { SOSReport } from '@resqnet/shared-types';

type StatusReport = Pick<
  SOSReport,
  'id' | 'created_at' | 'name' | 'category' | 'severity' | 'message' | 'status' | 'assigned_to'
>;

export default function StatusScreen() {
  const [reports, setReports] = useState<StatusReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientReady, setClientReady] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const client = await getSupabaseClient();
      if (!client) {
        setReports([]);
        return;
      }
      const { data, error } = await client
        .from('sos_reports')
        .select('id, created_at, name, category, severity, message, status, assigned_to')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setReports(data);
      }
    } catch {
      // offline - show nothing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports().finally(() => setClientReady(true));

    let channel: any = null;
    (async () => {
      const client = await getSupabaseClient();
      if (!client) return;
      channel = client
        .channel('status-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_reports' }, () => {
          fetchReports();
        })
        .subscribe();
    })();

    return () => {
      if (channel) {
        void (async () => {
          const client = await getSupabaseClient();
          client?.removeChannel(channel as any);
        })();
      }
    };
  }, [fetchReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  }, [fetchReports]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: '#eab308', bg: '#713f12' };
      case 'acknowledged':
        return { label: 'Acknowledged', color: '#3b82f6', bg: '#1e3a5f' };
      case 'in_progress':
        return { label: 'In Progress', color: '#f97316', bg: '#7c2d12' };
      case 'resolved':
        return { label: 'Resolved', color: '#22c55e', bg: '#14532d' };
      default:
        return { label: status, color: '#94a3b8', bg: '#334155' };
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  const renderItem = ({ item }: { item: StatusReport }) => {
    const cat = SOS_CATEGORIES.find((c) => c.key === item.category);
    const sev = SEVERITY_LEVELS.find((s) => s.level === item.severity);
    const status = getStatusInfo(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBadge, { backgroundColor: (cat?.color || '#94a3b8') + '25' }]}>
            <Text style={styles.cardEmoji}>{cat?.icon || '⚠️'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardCategory}>{item.category}</Text>
            <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <View style={[styles.badgeDot, { backgroundColor: status.color }]} />
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {item.message && (
          <Text style={styles.cardMessage} numberOfLines={2}>
            {item.message}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={[styles.sevBadge, { backgroundColor: sev?.bgColor || '#334155' }]}>
            <Text style={[styles.sevText, { color: sev?.color || '#94a3b8' }]}>
              Severity {item.severity}
            </Text>
          </View>
          {item.name && <Text style={styles.nameText}>{item.name}</Text>}
          {item.assigned_to && <Text style={styles.assignedText}>Assigned</Text>}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{clientReady ? 'Loading reports...' : 'Preparing connection...'}</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyText}>No reports found</Text>
            <Text style={styles.emptySubtext}>Connect to internet to see report statuses</Text>
          </View>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8aa0c7', fontSize: 16 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#111a2d',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1c2742',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 18 },
  cardInfo: { flex: 1 },
  cardCategory: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  cardTime: { fontSize: 11, color: '#8aa0c7', marginTop: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMessage: { color: '#b7c5e1', fontSize: 13, lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sevBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sevText: { fontSize: 10, fontWeight: '700' },
  nameText: { color: '#8aa0c7', fontSize: 11 },
  assignedText: { color: '#3b82f6', fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#8aa0c7' },
  emptySubtext: { fontSize: 14, color: '#6f82a7', marginTop: 4 },
});
