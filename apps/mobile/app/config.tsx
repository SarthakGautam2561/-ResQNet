import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSupabaseConfig, setSupabaseConfig, clearSupabaseConfig } from '../services/supabase';

export default function ConfigScreen() {
  const [url, setUrl] = useState('');
  const [anon, setAnon] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const config = await getSupabaseConfig();
      if (config) {
        setUrl(config.url);
        setAnon(config.anon);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!url.trim() || !anon.trim()) {
      Alert.alert('Required', 'Please enter both Supabase URL and Anon key.');
      return;
    }
    await setSupabaseConfig(url, anon);
    Alert.alert('Saved', 'Supabase configuration saved. You can go back now.');
  };

  const handleClear = async () => {
    await clearSupabaseConfig();
    setUrl('');
    setAnon('');
    Alert.alert('Cleared', 'Supabase configuration cleared.');
  };

  return (
    <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Supabase Setup</Text>
        <Text style={styles.subtitle}>
          If the build does not have env vars, paste them here once. This is only stored on-device.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>SUPABASE URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://xxxx.supabase.co"
            placeholderTextColor="#637199"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
          />

          <Text style={styles.label}>ANON PUBLIC KEY</Text>
          <TextInput
            style={[styles.input, styles.inputTall]}
            placeholder="eyJhbGciOi..."
            placeholderTextColor="#637199"
            value={anon}
            onChangeText={setAnon}
            autoCapitalize="none"
            multiline
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Save Configuration'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonOutline} onPress={handleClear}>
          <Text style={styles.buttonOutlineText}>Clear Saved Config</Text>
        </TouchableOpacity>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Tip: For production builds, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
            in EAS environment variables so you do not need to paste them here.
          </Text>
        </View>
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
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
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
    padding: 16,
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9fb0d1',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0f182c',
    borderRadius: 12,
    padding: 12,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#23314f',
  },
  inputTall: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
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
  note: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#223253',
    padding: 12,
    backgroundColor: '#0f1b33',
  },
  noteText: {
    color: '#cbd5f5',
    fontSize: 11,
    lineHeight: 16,
  },
});

