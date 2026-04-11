import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SOS_CATEGORIES, SEVERITY_LEVELS } from '../constants/categories';
import { getCurrentLocation, getDistrictFromCoordinates, Coordinates } from '../services/locationService';
import { addToQueue } from '../services/offlineQueue';
import { syncAllPending } from '../services/syncService';
import { isSupabaseConfigured } from '../services/supabase';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import type { SOSCategory, SeverityLevel } from '@resqnet/shared-types';

export default function SOSFormScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<SOSCategory | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel>(3);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoadingLocation(true);
      const coords = await getCurrentLocation();
      const district = await getDistrictFromCoordinates(coords.latitude, coords.longitude);
      setLocation({ ...coords, district });
      setIsLoadingLocation(false);
    })();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!category) {
      Alert.alert('Required', 'Please select an emergency category');
      return;
    }
    if (!location) {
      Alert.alert('Location Required', 'Waiting for GPS location...');
      return;
    }

    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await addToQueue({
        name: name.trim() || null,
        phone: phone.trim() || null,
        latitude: location.latitude,
        longitude: location.longitude,
        district: location.district || null,
        category,
        severity,
        message: message.trim() || null,
      });

      let syncedNow = false;
      let syncFailed = false;
      let configMissing = false;

      if (isConnected) {
        const configured = await isSupabaseConfigured();
        configMissing = !configured;
        if (configured) {
          const result = await syncAllPending();
          syncedNow = result.synced > 0;
          syncFailed = result.failed > 0 && result.synced === 0;
        }
      }

      const messageText = isConnected
        ? syncedNow
          ? 'Your emergency report has been sent to responders.'
          : syncFailed
            ? 'Saved locally due to a network error. Will retry automatically.'
            : configMissing
              ? 'Saved locally. Configure Supabase to enable sync.'
              : 'Saved locally. Will sync shortly.'
        : 'Report saved locally. Will auto-send when internet returns.';

      Alert.alert('SOS Submitted', messageText, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Error', 'Failed to save report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [category, location, name, phone, severity, message, isConnected, router]);

  return (
    <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Send SOS</Text>
        <Text style={styles.subtitle}>Give responders the fastest signal possible.</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>EMERGENCY TYPE</Text>
          <View style={styles.categoryGrid}>
            {SOS_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryItem,
                  category === cat.key && { borderColor: cat.color, backgroundColor: cat.color + '25' },
                ]}
                onPress={() => {
                  setCategory(cat.key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryLabel, category === cat.key && { color: cat.color }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SEVERITY LEVEL</Text>
          <View style={styles.severityRow}>
            {SEVERITY_LEVELS.map((s) => (
              <TouchableOpacity
                key={s.level}
                style={[
                  styles.severityItem,
                  {
                    backgroundColor: severity === s.level ? s.color : s.bgColor,
                    borderColor: severity === s.level ? s.color : 'transparent',
                  },
                ]}
                onPress={() => {
                  setSeverity(s.level);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text style={[styles.severityNumber, { color: severity === s.level ? '#fff' : s.color }]}>
                  {s.level}
                </Text>
                <Text style={[styles.severityLabel, { color: severity === s.level ? '#fff' : s.color }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>DESCRIBE EMERGENCY</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="What’s happening? Who needs help? Any hazards?"
            placeholderTextColor="#637199"
            multiline
            numberOfLines={5}
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>YOUR INFO (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#637199"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#637199"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>LOCATION</Text>
          <View style={styles.locationBar}>
            {isLoadingLocation ? (
              <>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.locationText}>Getting GPS location...</Text>
              </>
            ) : location ? (
              <>
                <Text style={styles.locationDot}>📍</Text>
                <Text style={styles.locationText}>
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
              </>
            ) : (
              <Text style={[styles.locationText, { color: '#ef4444' }]}>Location unavailable</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#ff5a5a', '#ef4444', '#b91c1c']} style={styles.submitGradient}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitText}>SEND SOS</Text>
                <Text style={styles.submitSubtext}>
                  {isConnected ? 'Will be sent immediately' : 'Saved locally, syncs when online'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
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
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    color: '#8aa0c7',
  },
  sectionCard: {
    backgroundColor: '#111a2d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1c2742',
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9fb0d1',
    letterSpacing: 2,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryItem: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#0f182c',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#23314f',
  },
  categoryIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9fb0d1',
    textAlign: 'center',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityItem: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  severityNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  severityLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  messageInput: {
    backgroundColor: '#0f182c',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#23314f',
  },
  input: {
    backgroundColor: '#0f182c',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#23314f',
    marginBottom: 10,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f182c',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23314f',
  },
  locationDot: {
    fontSize: 16,
  },
  locationText: {
    color: '#9fb0d1',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  submitButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#ff5a5a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  submitGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  submitSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 4,
  },
});
