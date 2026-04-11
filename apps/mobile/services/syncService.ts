import * as Network from 'expo-network';
import { supabase } from './supabase';
import { getUnsyncedReports, markAsSynced, incrementRetry } from './offlineQueue';

let syncInterval: ReturnType<typeof setInterval> | null = null;

// Check if device has internet connectivity
export async function isOnline(): Promise<boolean> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected === true && networkState.isInternetReachable === true;
  } catch {
    return false;
  }
}

// Sync a single report to Supabase
async function syncReport(report: {
  id: string;
  name: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  category: string;
  severity: number;
  message: string | null;
  created_at: string;
  source_device: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('sos_reports').insert({
      name: report.name,
      phone: report.phone,
      latitude: report.latitude,
      longitude: report.longitude,
      category: report.category,
      severity: report.severity,
      message: report.message,
      created_at: report.created_at,
      source_device: report.source_device,
      synced_at: new Date().toISOString(),
      status: 'pending',
    });

    if (error) {
      console.error('Sync error for report', report.id, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Network error syncing report', report.id, e);
    return false;
  }
}

// Sync all pending reports
export async function syncAllPending(): Promise<{ synced: number; failed: number }> {
  const online = await isOnline();
  if (!online) {
    return { synced: 0, failed: 0 };
  }

  const unsynced = await getUnsyncedReports();
  let synced = 0;
  let failed = 0;

  for (const report of unsynced) {
    // Skip reports that have failed too many times (max 10 retries)
    if (report.retry_count >= 10) {
      continue;
    }

    const success = await syncReport(report);
    if (success) {
      await markAsSynced(report.id);
      synced++;
    } else {
      await incrementRetry(report.id);
      failed++;
    }
  }

  return { synced, failed };
}

// Start automatic background sync (every 30 seconds)
export function startAutoSync(onSyncComplete?: (result: { synced: number; failed: number }) => void): void {
  if (syncInterval) return; // Already running

  syncInterval = setInterval(async () => {
    const result = await syncAllPending();
    if (result.synced > 0 || result.failed > 0) {
      onSyncComplete?.(result);
    }
  }, 30000); // Every 30 seconds

  // Also do an immediate sync
  syncAllPending().then((result) => {
    if (result.synced > 0 || result.failed > 0) {
      onSyncComplete?.(result);
    }
  });
}

// Stop automatic sync
export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
