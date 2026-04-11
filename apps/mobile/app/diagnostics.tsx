import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSupabaseStatus, testSupabaseInsert, testSupabaseFetch } from '../services/diagnostics';
import { getStorageInfo } from '../services/kvStorage';
import { getQueue, addToQueue, clearQueue } from '../services/offlineQueue';
import { useRouter } from 'expo-router';

export default function DiagnosticsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<{ url: string; anonMasked: string; source: string }>({
    url: '',
    anonMasked: '',
    source: 'missing',
  });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ path: string; exists: boolean; size: number | null; lastError: string | null } | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  const loadStatus = async () => {
    setLoading(true);
    const s = await getSupabaseStatus();
    setStatus(s);
    const info = await getStorageInfo();
    setStorageInfo(info);
    const queue = await getQueue();
    setQueueCount(queue.length);
    setLoading(false);
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const runInsert = async () => {
    setBusy(true);
    const res = await testSupabaseInsert();
    setResult(res.ok ? `Insert OK: ${res.message}` : `Insert failed: ${res.message}`);
    await loadStatus();
    setBusy(false);
  };

  const runFetch = async () => {
    setBusy(true);
    const res = await testSupabaseFetch();
    setResult(res.ok ? `Fetch OK: ${res.message}` : `Fetch failed: ${res.message}`);
    await loadStatus();
    setBusy(false);
  };

  const runQueueTest = async () => {
    setBusy(true);
    await addToQueue({
      name: 'Local Test',
      phone: null,
      latitude: 0,
      longitude: 0,
      category: 'Other',
      severity: 1,
      message: 'queue test',
    });
    setResult('Queue test added. Open Pending Reports to confirm.');
    await loadStatus();
    setBusy(false);
  };

  const runQueueClear = async () => {
    setBusy(true);
    await clearQueue();
    setResult('Local queue cleared.');
    await loadStatus();
    setBusy(false);
  };

  return (
    <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Diagnostics</Text>
        <Text style={styles.subtitle}>Check Supabase connectivity without guessing.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>SUPABASE URL</Text>
          {loading ? (
            <ActivityIndicator color="#93c5fd" />
          ) : (
            <Text style={styles.value}>{status.url || 'Not set'}</Text>
          )}

          <Text style={styles.label}>ANON KEY</Text>
          <Text style={styles.value}>{status.anonMasked || 'Not set'}</Text>

          <Text style={styles.label}>SOURCE</Text>
          <Text style={styles.value}>{status.source}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>LOCAL STORAGE</Text>
          {storageInfo ? (
            <>
              <Text style={styles.value}>Path: {storageInfo.path}</Text>
              <Text style={styles.value}>Exists: {storageInfo.exists ? 'yes' : 'no'}</Text>
              <Text style={styles.value}>Size: {storageInfo.size ?? 'n/a'}</Text>
              <Text style={styles.value}>Queue count: {queueCount}</Text>
              {storageInfo.lastError && <Text style={styles.value}>Last error: {storageInfo.lastError}</Text>}
            </>
          ) : (
            <Text style={styles.value}>Loading...</Text>
          )}
        </View>

        <TouchableOpacity style={styles.buttonOutline} onPress={() => router.push('/config')}>
          <Text style={styles.buttonOutlineText}>Open Supabase Setup</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={runInsert} disabled={busy}>
          <Text style={styles.buttonText}>{busy ? 'Working...' : 'Test Insert'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={runFetch} disabled={busy}>
          <Text style={styles.buttonText}>{busy ? 'Working...' : 'Test Fetch'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonOutline} onPress={runQueueTest} disabled={busy}>
          <Text style={styles.buttonOutlineText}>{busy ? 'Working...' : 'Add Test Queue Item'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonOutline} onPress={runQueueClear} disabled={busy}>
          <Text style={styles.buttonOutlineText}>{busy ? 'Working...' : 'Clear Local Queue'}</Text>
        </TouchableOpacity>

        {result && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: '900', color: '#f8fafc' },
  subtitle: { fontSize: 12, color: '#9fb0d1', lineHeight: 18 },
  card: {
    backgroundColor: '#111a2d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1c2742',
    padding: 16,
    gap: 8,
  },
  label: { fontSize: 11, fontWeight: '800', color: '#9fb0d1', letterSpacing: 1 },
  value: { color: '#cbd5f5', fontSize: 12 },
  button: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', letterSpacing: 0.4 },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#2d3d5e',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#0f182c',
  },
  buttonOutlineText: { color: '#93c5fd', fontWeight: '700' },
  resultBox: {
    backgroundColor: '#0f1b33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#223253',
    padding: 12,
  },
  resultText: { color: '#cbd5f5', fontSize: 12, lineHeight: 18 },
});
