import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getPendingCount } from '../services/offlineQueue';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };
    loadCount();
    const interval = setInterval(loadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>RESQNET</Text>
        <Text style={styles.subtitle}>Emergency Response System</Text>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
      </View>

      {/* Giant SOS Button */}
      <TouchableOpacity
        style={styles.sosButton}
        onPress={() => router.push('/sos-form')}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#ef4444', '#dc2626', '#b91c1c']}
          style={styles.sosGradient}
        >
          <Text style={styles.sosIcon}>🆘</Text>
          <Text style={styles.sosText}>SEND SOS</Text>
          <Text style={styles.sosSubtext}>Tap to report emergency</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Action Buttons Grid */}
      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.gridButton, styles.pendingButton]}
          onPress={() => router.push('/pending')}
        >
          <Text style={styles.gridIcon}>📋</Text>
          <Text style={styles.gridLabel}>Pending</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridButton, styles.statusButton]}
          onPress={() => router.push('/status')}
        >
          <Text style={styles.gridIcon}>📊</Text>
          <Text style={styles.gridLabel}>Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridButton, styles.tipsButton]}
          onPress={() => {}}
        >
          <Text style={styles.gridIcon}>💡</Text>
          <Text style={styles.gridLabel}>Safety Tips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridButton, styles.mapButton]}
          onPress={() => {}}
        >
          <Text style={styles.gridIcon}>🗺️</Text>
          <Text style={styles.gridLabel}>Heatmap</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isConnected ? '🟢 Online — Reports syncing' : '🔴 Offline — Reports saved locally'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ef4444',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  sosButton: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  sosGradient: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  sosIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  sosText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
  },
  sosSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridButton: {
    width: (width - 52) / 2,
    paddingVertical: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pendingButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tipsButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  gridIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.5,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748b',
    fontSize: 13,
  },
});
