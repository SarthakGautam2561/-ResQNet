import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'resqnet_supabase_url';
const STORAGE_ANON_KEY = 'resqnet_supabase_anon';

function getStoredConfig() {
  if (typeof window === 'undefined') {
    return { url: undefined as string | undefined, anon: undefined as string | undefined };
  }
  return {
    url: window.localStorage.getItem(STORAGE_URL_KEY) || undefined,
    anon: window.localStorage.getItem(STORAGE_ANON_KEY) || undefined,
  };
}

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || getStoredConfig().url;
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || getStoredConfig().anon;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string)
  : null;

export function saveSupabaseConfig(url: string, anon: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_URL_KEY, url.trim());
  window.localStorage.setItem(STORAGE_ANON_KEY, anon.trim());
  window.location.reload();
}

export function clearSupabaseConfig() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_URL_KEY);
  window.localStorage.removeItem(STORAGE_ANON_KEY);
  window.location.reload();
}
