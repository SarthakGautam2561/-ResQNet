import uuid from 'react-native-uuid';
import { getSupabaseClient, getSupabaseConfig, getSupabaseEnvConfig } from './supabase';
import { kvStorage } from './kvStorage';

const CONFIG_URL_KEY = 'resqnet_supabase_url';
const CONFIG_ANON_KEY = 'resqnet_supabase_anon';

export async function getSupabaseStatus(): Promise<{
  url: string;
  anonMasked: string;
  source: 'env' | 'stored' | 'missing';
}> {
  const env = getSupabaseEnvConfig();
  if (env.url && env.anon) {
    return {
      url: env.url,
      anonMasked: maskKey(env.anon),
      source: 'env',
    };
  }

  const storedUrl = await kvStorage.getItem(CONFIG_URL_KEY);
  const storedAnon = await kvStorage.getItem(CONFIG_ANON_KEY);
  if (storedUrl && storedAnon) {
    return {
      url: storedUrl,
      anonMasked: maskKey(storedAnon),
      source: 'stored',
    };
  }

  return {
    url: '',
    anonMasked: '',
    source: 'missing',
  };
}

export async function testSupabaseInsert(): Promise<{ ok: boolean; message: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const id = uuid.v4() as string;
  const payload = {
    id,
    name: 'Diagnostic',
    phone: null,
    latitude: 0,
    longitude: 0,
    category: 'Other',
    severity: 1,
    message: 'diagnostic ping',
    created_at: new Date().toISOString(),
    source_device: 'diagnostic',
    status: 'pending',
  };

  const { error } = await client.from('sos_reports').insert(payload);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: `Insert OK (${id.slice(0, 8)})` };
}

export async function testSupabaseFetch(): Promise<{ ok: boolean; message: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const { data, error } = await client
    .from('sos_reports')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!data || data.length === 0) {
    return { ok: true, message: 'Fetch OK (no rows yet)' };
  }

  return { ok: true, message: `Fetch OK (latest ${data[0].id.slice(0, 8)})` };
}

function maskKey(key: string): string {
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
