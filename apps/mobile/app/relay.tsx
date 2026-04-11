import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BluetoothDevice } from 'react-native-bluetooth-classic';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import {
  ensureBluetoothEnabled,
  isBluetoothEnabled,
  getPairedDevices,
  discoverRelayDevices,
  sendPendingToDevice,
  startRelayListener,
  stopRelayListener,
  openBluetoothSettings,
} from '../services/relayService';
import { getPendingCount } from '../services/offlineQueue';
import { isSupabaseConfigured } from '../services/supabase';

type RelayState = 'idle' | 'listening' | 'connected';

export default function RelayScreen() {
  const { isConnected } = useNetworkStatus();
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [listenerState, setListenerState] = useState<RelayState>('idle');
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [selected, setSelected] = useState<BluetoothDevice | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [scanBusy, setScanBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasConfig, setHasConfig] = useState(true);

  const refreshBluetooth = useCallback(async () => {
    const enabled = await isBluetoothEnabled();
    setBluetoothOn(enabled);
  }, []);

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshBluetooth();
    refreshPending();
    (async () => {
      const configured = await isSupabaseConfigured();
      setHasConfig(configured);
    })();
    return () => {
      stopRelayListener();
    };
  }, [refreshBluetooth, refreshPending]);

  const handleStartListener = useCallback(async () => {
    setStatusMessage(null);
    try {
      setListenerState('listening');
      await startRelayListener((status) => {
        if (status === 'connected') setListenerState('connected');
      });
      await refreshBluetooth();
    } catch {
      setListenerState('idle');
      setStatusMessage('Bluetooth not available. Enable Bluetooth and try again.');
    }
  }, [refreshBluetooth]);

  const handleStopListener = useCallback(async () => {
    await stopRelayListener();
    setListenerState('idle');
  }, []);

  const handleScan = useCallback(async () => {
    setScanBusy(true);
    setStatusMessage(null);
    const enabled = await ensureBluetoothEnabled();
    if (!enabled) {
      setStatusMessage('Bluetooth is off. Please enable it first.');
      setScanBusy(false);
      return;
    }

    const paired = await getPairedDevices();
    const discovered = await discoverRelayDevices();
    const merged = new Map<string, BluetoothDevice>();
    paired.forEach((device) => merged.set(device.address ?? device.id, device));
    discovered.forEach((device) => merged.set(device.address ?? device.id, device));
    const list = Array.from(merged.values());
    setDevices(list);
    setSelected(list[0] ?? null);
    setScanBusy(false);
  }, []);

  const handleSend = useCallback(async () => {
    if (!selected) {
      setStatusMessage('Select a relay device first.');
      return;
    }
    setSendBusy(true);
    setStatusMessage('Sending pending SOS to relay...');
    try {
      const result = await sendPendingToDevice(selected);
      await refreshPending();
      if (result.sent === 0) {
        setStatusMessage('No pending SOS reports to send.');
      } else {
        setStatusMessage(`Delivered ${result.acked}/${result.sent} reports to relay.`);
      }
    } catch {
      setStatusMessage('Failed to send reports. Ensure the relay device is nearby.');
    } finally {
      setSendBusy(false);
    }
  }, [selected, refreshPending]);

  return (
    <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Bluetooth Relay</Text>
        <Text style={styles.subtitle}>
          Foreground-only relay. Keep this screen open while connecting nearby devices.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receiver Mode (Online Device)</Text>
          <Text style={styles.cardSubtitle}>
            Use this on the phone that has internet so it can forward SOS to Supabase.
          </Text>
          {!hasConfig && (
            <View style={styles.bannerWarning}>
              <Text style={styles.bannerWarningText}>Supabase not configured. Set it in Supabase Setup first.</Text>
            </View>
          )}

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: bluetoothOn ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.statusText}>{bluetoothOn ? 'Bluetooth On' : 'Bluetooth Off'}</Text>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.statusText}>{isConnected ? 'Internet On' : 'No Internet'}</Text>
          </View>

          <View style={styles.listenerRow}>
            <Text style={styles.listenerLabel}>
              {listenerState === 'idle' && 'Listener stopped'}
              {listenerState === 'listening' && 'Waiting for connection...'}
              {listenerState === 'connected' && 'Relay connected'}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.button, listenerState !== 'idle' && styles.buttonActive]}
              onPress={listenerState === 'idle' ? handleStartListener : handleStopListener}
            >
              <Text style={styles.buttonText}>
                {listenerState === 'idle' ? 'Start Relay Listener' : 'Stop Relay Listener'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonOutline} onPress={openBluetoothSettings}>
              <Text style={styles.buttonOutlineText}>Bluetooth Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sender Mode (Offline Device)</Text>
          <Text style={styles.cardSubtitle}>
            Use this on the phone without internet. It will send queued SOS to a nearby relay.
          </Text>

          <View style={styles.queueRow}>
            <Text style={styles.queueLabel}>Pending SOS</Text>
            <Text style={styles.queueValue}>{pendingCount}</Text>
          </View>

          <TouchableOpacity style={styles.buttonOutline} onPress={handleScan} disabled={scanBusy}>
            {scanBusy ? <ActivityIndicator color="#93c5fd" /> : <Text style={styles.buttonOutlineText}>Scan for Relays</Text>}
          </TouchableOpacity>

          {devices.length === 0 ? (
            <Text style={styles.emptyText}>No relays found yet. Make sure the relay device is discoverable.</Text>
          ) : (
            <View style={styles.deviceList}>
              {devices.map((device) => {
                const key = device.address ?? device.id;
                const active = selected?.address === device.address && selected?.id === device.id;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.deviceItem, active && styles.deviceItemActive]}
                    onPress={() => setSelected(device)}
                  >
                    <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
                    <Text style={styles.deviceMeta}>{device.address ?? device.id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity style={[styles.button, sendBusy && styles.buttonDisabled]} onPress={handleSend} disabled={sendBusy}>
            {sendBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Pending SOS</Text>}
          </TouchableOpacity>
        </View>

        {statusMessage && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>{statusMessage}</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#9fb0d1',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#111a2d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1c2742',
    padding: 18,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#8aa0c7',
    lineHeight: 17,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  listenerRow: {
    paddingVertical: 6,
  },
  listenerLabel: {
    color: '#a7b7dd',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    gap: 10,
  },
  button: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#16a34a',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#2d3d5e',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#0f182c',
  },
  buttonOutlineText: {
    color: '#93c5fd',
    fontWeight: '700',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f182c',
    padding: 10,
    borderRadius: 10,
  },
  queueLabel: {
    color: '#8aa0c7',
    fontSize: 12,
    fontWeight: '700',
  },
  queueValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  deviceList: {
    gap: 8,
  },
  deviceItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#223253',
    padding: 10,
    backgroundColor: '#0f182c',
  },
  deviceItemActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0f2340',
  },
  deviceName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  deviceMeta: {
    color: '#8aa0c7',
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: '#8aa0c7',
    fontSize: 11,
    lineHeight: 16,
  },
  statusBanner: {
    backgroundColor: '#0f1b33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#223253',
    padding: 12,
  },
  statusBannerText: {
    color: '#cbd5f5',
    fontSize: 12,
    lineHeight: 18,
  },
  bannerWarning: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7c2d12',
    backgroundColor: '#2b1508',
    padding: 10,
  },
  bannerWarningText: {
    color: '#fdba74',
    fontSize: 11,
    fontWeight: '700',
  },
});
