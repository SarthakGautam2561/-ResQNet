import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { startAutoSync, stopAutoSync } from '../services/syncService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function RootLayout() {
  const { isConnected } = useNetworkStatus();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    startAutoSync((result) => {
      if (result.synced > 0) {
        setSyncMessage(`${result.synced} report(s) synced`);
        setTimeout(() => setSyncMessage(null), 3000);
      }
    });
    return () => {
      stopAutoSync();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>No Internet — Reports saved locally</Text>
        </View>
      )}

      {syncMessage && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>{syncMessage}</Text>
        </View>
      )}

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0e1a' },
          headerTintColor: '#f8fafc',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0a0e1a' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'ResQNet', headerShown: false }} />
        <Stack.Screen
          name="sos-form"
          options={{
            title: 'Send SOS',
            headerStyle: { backgroundColor: '#1a0000' },
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="pending" options={{ title: 'Pending Reports' }} />
        <Stack.Screen name="status" options={{ title: 'Report Status' }} />
        <Stack.Screen name="relay" options={{ title: 'Relay Mode' }} />
        <Stack.Screen name="config" options={{ title: 'Supabase Setup' }} />
        <Stack.Screen name="diagnostics" options={{ title: 'Diagnostics' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  offlineBanner: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  syncBanner: {
    backgroundColor: '#16a34a',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  syncText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
