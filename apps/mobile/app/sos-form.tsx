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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SOS_CATEGORIES, SEVERITY_LEVELS } from '../constants/categories';
import type { SOSCategory, SeverityLevel } from '@resqnet/shared-types';
import { getCurrentLocation, Coordinates } from '../services/locationService';
import { addToQueue } from '../services/offlineQueue';
import { syncAllPending } from '../services/syncService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

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

  // Get GPS immediately on form open
  useEffect(() => {
    (async () => {
      setIsLoadingLocation(true);
      const coords = await getCurrentLocation();
      setLocation(coords);
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
        category,
        severity,
        message: message.trim() || null,
      });

      // Try to sync immediately if online
      if (isConnected) {
        await syncAllPending();
      }

      Alert.alert(
        '✅ SOS Submitted',
        isConnected
          ? 'Your emergency report has been sent to responders.'
          : 'Report saved locally. Will auto-send when internet returns.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [category, location, name, phone, severity, message, isConnected, router]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Category Selection */}
      <Text style={styles.sectionTitle}>EMERGENCY TYPE</Text>
      <View style={styles.categoryGrid}>
        {SOS_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryItem,
              category === cat.key && { backgroundColor: cat.color + '30', borderColor: cat.color },
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

      {/* Severity */}
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
                borderWidth: severity === s.level ? 2 : 0,
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

      {/* Message */}
      <Text style={styles.sectionTitle}>DESCRIBE EMERGENCY</Text>
      <TextInput
        style={styles.messageInput}
        placeholder="What's happening? Describe your situation..."
        placeholderTextColor="#475569"
        multiline
        numberOfLines={4}
        value={message}
        onChangeText={setMessage}
        textAlignVertical="top"
      />

      {/* Optional Details */}
      <Text style={styles.sectionTitle}>YOUR INFO (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="#475569"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#475569"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {/* Location Status */}
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
          <Text style={[styles.locationText, { color: '#ef4444' }]}>⚠️ Location unavailable</Text>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.submitText}>🚨 SEND SOS</Text>
            <Text style={styles.submitSubtext}>
              {isConnected ? 'Will be sent immediately' : 'Saved locally, syncs when online'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 2,
    marginBottom: 12,
    marginTop: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryItem: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
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
  },
  severityNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  severityLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  messageInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  locationDot: {
    fontSize: 16,
  },
  locationText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  submitButton: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  submitSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
});
