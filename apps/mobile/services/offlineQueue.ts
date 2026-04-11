import uuid from 'react-native-uuid';
import type { QueuedSOSReport } from '@resqnet/shared-types';
import { kvStorage } from './kvStorage';

const QUEUE_KEY = 'resqnet_sos_queue';

export type QueuedReport = QueuedSOSReport;

// Get all queued reports
export async function getQueue(): Promise<QueuedReport[]> {
  try {
    const data = await kvStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Add a new report to the queue
export async function addToQueue(report: Omit<QueuedReport, 'id' | 'synced' | 'retry_count' | 'created_at' | 'source_device'>): Promise<QueuedReport> {
  const queue = await getQueue();
  const newReport: QueuedReport = {
    ...report,
    id: uuid.v4() as string,
    created_at: new Date().toISOString(),
    source_device: 'mobile_app',
    synced: false,
    retry_count: 0,
  };
  queue.push(newReport);
  await kvStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return newReport;
}

// Get only unsynced reports
export async function getUnsyncedReports(): Promise<QueuedReport[]> {
  const queue = await getQueue();
  return queue.filter((r) => !r.synced);
}

// Mark a report as synced
export async function markAsSynced(reportId: string): Promise<void> {
  const queue = await getQueue();
  const updated = queue.map((r) =>
    r.id === reportId ? { ...r, synced: true } : r
  );
  await kvStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

// Increment retry count
export async function incrementRetry(reportId: string): Promise<void> {
  const queue = await getQueue();
  const updated = queue.map((r) =>
    r.id === reportId ? { ...r, retry_count: r.retry_count + 1 } : r
  );
  await kvStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

// Get count of pending (unsynced) reports
export async function getPendingCount(): Promise<number> {
  const unsynced = await getUnsyncedReports();
  return unsynced.length;
}

// Clear all synced reports older than 24 hours
export async function cleanupSyncedReports(): Promise<void> {
  const queue = await getQueue();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const filtered = queue.filter(
    (r) => !r.synced || new Date(r.created_at).getTime() > oneDayAgo
  );
  await kvStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearQueue(): Promise<void> {
  await kvStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}
