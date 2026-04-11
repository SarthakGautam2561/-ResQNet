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
import { getQueue, QueuedReport } from '../services/offlineQueue';
import { syncAllPending } from '../services/syncService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { SOS_CATEGORIES, SEVERITY_LEVELS } from '../constants/categories';

export default function PendingScreen() {
  const { isConnected } = useNetworkStatus();
  const [reports, setReports] = useState<QueuedReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadReports = useCallback(async () => {
    const queue = await getQueue();
    // Show newest first, unsynced first
    const sorted = queue.sort((a, b) => {
      if (a.synced !== b.synced) return a.synced ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setReports(sorted);
  }, []);

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 5000);
    return () => clearInterval(interval);
  }, [loadReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }, [loadReports]);

  const handleManualSync = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('No Internet', 'Connect to the internet to sync reports.');
      return;
    }
    setSyncing(true);
    const result = await syncAllPending();
    await loadReports();
    setSyncing(false);
    Alert.alert('Sync Complete', `Synced: ${result.synced}, Failed: ${result.failed}`);
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
          <Text style={styles.cardEmoji}>{cat.icon}</Text>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardCategory}>{item.category}</Text>
            <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.synced ? '#16a34a' : '#eab308' }]}>
            <Text style={styles.statusText}>{item.synced ? '✓ Sent' : '⏳ Pending'}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={[styles.severityBadge, { backgroundColor: sev.bgColor }]}>
            <Text style={[styles.severityText, { color: sev.color }]}>
              Severity {item.severity} — {sev.label}
            </Text>
          </View>
          {item.message && <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>}
          <Text style={styles.cardCoords}>
            📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
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
    <View style={styles.container}>
      {/* Sync Header */}
      <View style={styles.syncHeader}>
        <View>
          <Text style={styles.syncCount}>{unsyncedCount} pending</Text>
          <Text style={styles.syncTotal}>{reports.length} total reports</Text>
        </View>
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleManualSync}
          disabled={syncing}
        >
          <Text style={styles.syncButtonText}>{syncing ? 'Syncing...' : '🔄 Sync Now'}</Text>
        </TouchableOpacity>
      </View>

      {/* Report List */}
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No reports yet</Text>
            <Text style={styles.emptySubtext}>Your SOS reports will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  syncCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  syncTotal: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  reportCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#eab308',
  },
  syncedCard: {
    borderLeftColor: '#16a34a',
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardEmoji: {
    fontSize: 24,
    marginRight: 10,
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
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  cardCoords: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  retryText: {
    color: '#f97316',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
});
