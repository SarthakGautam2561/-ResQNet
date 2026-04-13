import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { getQueue, QueuedReport } from '../services/offlineQueue';
import { syncAllPending, getLastSyncError } from '../services/syncService';
import { isSupabaseConfigured } from '../services/supabase';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { SOS_CATEGORIES, SEVERITY_LEVELS } from '../constants/categories';

export default function PendingScreen() {
  const { isConnected } = useNetworkStatus();
  const [reports, setReports] = useState<QueuedReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadReports = useCallback(async () => {
    const queue = await getQueue();
    const sorted = queue.sort((a, b) => {
      if (a.synced !== b.synced) return a.synced ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setReports(sorted);
    const err = await getLastSyncError();
    setLastError(err);
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
      const interval = setInterval(loadReports, 20000);
      return () => clearInterval(interval);
    }, [loadReports])
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }, [loadReports]);

  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    const configured = await isSupabaseConfigured();
    if (!configured) {
      setSyncing(false);
      Alert.alert('Supabase Missing', 'Set Supabase URL and key in Supabase Setup first.');
      return;
    }
    const result = await syncAllPending();
    await loadReports();
    setSyncing(false);
    Alert.alert(
      'Sync Complete',
      isConnected
        ? `Synced: ${result.synced}, Failed: ${result.failed}`
        : `Attempted sync while offline. Synced: ${result.synced}, Failed: ${result.failed}`
    );
  }, [isConnected, loadReports]);

  const getCategoryInfo = (key: string) => {
    return SOS_CATEGORIES.find((c) => c.key === key) || SOS_CATEGORIES[7];
  };

  const getSeverityInfo = (level: number) => {
    return SEVERITY_LEVELS.find((s) => s.level === level) || SEVERITY_LEVELS[2];
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

  const renderItem = ({ item }: { item: QueuedReport }) => {
    const cat = getCategoryInfo(item.category);
    const sev = getSeverityInfo(item.severity);

    return (
      <View style={[styles.reportCard, item.synced && styles.syncedCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: cat.color + '25' }]}>
            <Text style={styles.cardEmoji}>{cat.icon}</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardCategory}>{item.category}</Text>
            <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.synced ? '#16a34a' : '#eab308' }]}>
            <Text style={styles.statusText}>{item.synced ? 'SENT' : 'PENDING'}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={[styles.severityBadge, { backgroundColor: sev.bgColor }]}>
            <Text style={[styles.severityText, { color: sev.color }]}>
              Severity {item.severity} - {sev.label}
            </Text>
          </View>
          {item.message && <Text style={styles.cardMessage}>{item.message}</Text>}
          <Text style={styles.cardCoords}>
            Location: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
        </View>
        {item.retry_count > 0 && !item.synced && (
          <Text style={styles.retryText}>Retries: {item.retry_count}</Text>
        )}
      </View>
    );
  };

  const unsyncedCount = reports.filter((r) => !r.synced).length;

  return (
    <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.syncHeader}>
          <View>
            <Text style={styles.syncCount}>{unsyncedCount} pending</Text>
            <Text style={styles.syncTotal}>{reports.length} total reports</Text>
            <Text style={styles.syncMeta}>Last update: {lastUpdated || '--'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleManualSync}
            disabled={syncing}
          >
            <Text style={styles.syncButtonText}>{syncing ? 'Syncing...' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusBar}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.statusBarText}>{isConnected ? 'Online' : 'Offline'}</Text>
          {lastError && <Text style={styles.statusBarError}>Last error: {lastError}</Text>}
        </View>

        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No reports yet</Text>
              <Text style={styles.emptySubtext}>Your SOS reports will appear here</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0f182c',
    borderBottomWidth: 1,
    borderBottomColor: '#1c2742',
  },
  syncCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  syncTotal: {
    fontSize: 12,
    color: '#8aa0c7',
    marginTop: 2,
  },
  syncMeta: {
    fontSize: 11,
    color: '#6f82a7',
    marginTop: 4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0f182c',
    borderBottomWidth: 1,
    borderBottomColor: '#1c2742',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBarText: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBarError: {
    color: '#fdba74',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  syncButton: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  reportCard: {
    backgroundColor: '#111a2d',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1c2742',
  },
  syncedCard: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 18,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  cardTime: {
    fontSize: 11,
    color: '#8aa0c7',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardBody: {
    gap: 6,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMessage: {
    color: '#b7c5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  cardCoords: {
    color: '#7c8fb4',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  retryText: {
    color: '#f97316',
    fontSize: 11,
    marginTop: 8,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8aa0c7',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6f82a7',
    marginTop: 4,
  },
});
