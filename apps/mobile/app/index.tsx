import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getPendingCount } from '../services/offlineQueue';
import { isSupabaseConfigured } from '../services/supabase';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [hasConfig, setHasConfig] = useState(true);

  const loadCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCount();
      const interval = setInterval(loadCount, 15000);
      return () => clearInterval(interval);
    }, [loadCount])
  );

  useEffect(() => {
    const loadConfig = async () => {
      const configured = await isSupabaseConfigured();
      setHasConfig(configured);
    };
    loadConfig();
  }, []);

  return (
    <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.logo}>RESQNET</Text>
            <View style={[styles.statusPill, isConnected ? styles.statusOnline : styles.statusOffline]}>
              <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
              <Text style={styles.statusText}>{isConnected ? 'ONLINE' : 'OFFLINE'}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Emergency Response System</Text>
        </View>

        {!hasConfig && (
          <TouchableOpacity style={styles.configBanner} onPress={() => router.push('/config')}>
            <Text style={styles.configBannerText}>Supabase not configured — tap to set URL and key</Text>
          </TouchableOpacity>
        )}

        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>PENDING</Text>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statHint}>Queued on device</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>NETWORK</Text>
            <Text style={styles.statValue}>{isConnected ? 'LIVE' : 'OFFLINE'}</Text>
            <Text style={styles.statHint}>{isConnected ? 'Sync enabled' : 'Auto-sync later'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => router.push('/sos-form')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#ff5a5a', '#ef4444', '#b91c1c']} style={styles.sosGradient}>
            <Text style={styles.sosIcon}>SOS</Text>
            <Text style={styles.sosText}>SEND SOS</Text>
            <Text style={styles.sosSubtext}>One tap emergency report</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/pending')} activeOpacity={0.8}>
            <View style={styles.gridIconWrap}>
              <Text style={styles.gridIcon}>LIST</Text>
            </View>
            <Text style={styles.gridLabel}>Pending Reports</Text>
            <Text style={styles.gridHint}>Unsynced items</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/status')} activeOpacity={0.8}>
            <View style={styles.gridIconWrap}>
              <Text style={styles.gridIcon}>LIVE</Text>
            </View>
            <Text style={styles.gridLabel}>Live Status</Text>
            <Text style={styles.gridHint}>Updates from responders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => {}} activeOpacity={0.8}>
            <View style={styles.gridIconWrap}>
              <Text style={styles.gridIcon}>TIPS</Text>
            </View>
            <Text style={styles.gridLabel}>Safety Tips</Text>
            <Text style={styles.gridHint}>Offline guidance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/relay')} activeOpacity={0.8}>
            <View style={styles.gridIconWrap}>
              <Text style={styles.gridIcon}>RELAY</Text>
            </View>
            <Text style={styles.gridLabel}>Relay Mode</Text>
            <Text style={styles.gridHint}>Forward nearby SOS</Text>
          </TouchableOpacity>

          {!hasConfig && (
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/config')} activeOpacity={0.8}>
              <View style={styles.gridIconWrap}>
                <Text style={styles.gridIcon}>SET</Text>
              </View>
              <Text style={styles.gridLabel}>Supabase Setup</Text>
              <Text style={styles.gridHint}>Enter URL + key</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/diagnostics')} activeOpacity={0.8}>
            <View style={styles.gridIconWrap}>
              <Text style={styles.gridIcon}>DIAG</Text>
            </View>
            <Text style={styles.gridLabel}>Diagnostics</Text>
            <Text style={styles.gridHint}>Test Supabase</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isConnected ? 'Online — reports sync automatically' : 'Offline — reports saved on device'}
          </Text>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ff5a5a',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9fb0d1',
    marginTop: 6,
    letterSpacing: 1,
  },
  configBanner: {
    backgroundColor: '#0f1b33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#223253',
    padding: 12,
    marginBottom: 14,
  },
  configBannerText: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusOnline: {
    borderColor: 'rgba(34,197,94,0.4)',
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  statusOffline: {
    borderColor: 'rgba(239,68,68,0.4)',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111a2d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1c2742',
    padding: 14,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#8aa0c7',
  },
  statValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '900',
    color: '#f8fafc',
  },
  statHint: {
    marginTop: 4,
    fontSize: 11,
    color: '#8aa0c7',
  },
  sosButton: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#ff5a5a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  sosGradient: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  sosIcon: {
    fontSize: 26,
    marginBottom: 6,
    color: '#fff',
    letterSpacing: 6,
    fontWeight: '800',
  },
  sosText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
  },
  sosSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCard: {
    width: (width - 52) / 2,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#111a2d',
    borderWidth: 1,
    borderColor: '#1c2742',
  },
  gridIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridIcon: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5f5',
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: 0.3,
  },
  gridHint: {
    marginTop: 4,
    fontSize: 11,
    color: '#8aa0c7',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    marginTop: 18,
    alignItems: 'center',
  },
  footerText: {
    color: '#8aa0c7',
    fontSize: 13,
  },
});
