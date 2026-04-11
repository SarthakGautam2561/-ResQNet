import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { kvStorage } from './kvStorage';

const CONFIG_URL_KEY = 'resqnet_supabase_url';
const CONFIG_ANON_KEY = 'resqnet_supabase_anon';

let supabaseClient: SupabaseClient | null = null;
let activeConfig: { url: string; anon: string } | null = null;

export function getSupabaseEnvConfig() {
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const envAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const extraUrl = extra?.supabaseUrl ?? extra?.EXPO_PUBLIC_SUPABASE_URL;
  const extraAnon = extra?.supabaseAnonKey ?? extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return {
    url: envUrl || extraUrl || '',
    anon: envAnon || extraAnon || '',
  };
}

export async function getSupabaseConfig(): Promise<{ url: string; anon: string } | null> {
  const env = getSupabaseEnvConfig();
  if (env.url && env.anon) return env;

  const storedUrl = await kvStorage.getItem(CONFIG_URL_KEY);
  const storedAnon = await kvStorage.getItem(CONFIG_ANON_KEY);
  if (storedUrl && storedAnon) {
    return { url: storedUrl, anon: storedAnon };
  }
  return null;
}

export async function setSupabaseConfig(url: string, anon: string): Promise<void> {
  await kvStorage.setItem(CONFIG_URL_KEY, url.trim());
  await kvStorage.setItem(CONFIG_ANON_KEY, anon.trim());
  supabaseClient = null;
  activeConfig = null;
}

export async function clearSupabaseConfig(): Promise<void> {
  await kvStorage.removeItem(CONFIG_URL_KEY);
  await kvStorage.removeItem(CONFIG_ANON_KEY);
  supabaseClient = null;
  activeConfig = null;
}

export async function isSupabaseConfigured(): Promise<boolean> {
  const config = await getSupabaseConfig();
  return !!config;
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const config = await getSupabaseConfig();
  if (!config) return null;

  if (!supabaseClient || !activeConfig || activeConfig.url !== config.url || activeConfig.anon !== config.anon) {
    supabaseClient = createClient(config.url, config.anon, {
      auth: {
        storage: kvStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    activeConfig = config;
  }

  return supabaseClient;
}
