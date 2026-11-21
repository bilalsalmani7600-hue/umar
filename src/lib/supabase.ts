import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://luamazblgroduhlbvjip.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';

// Retrieve credentials from env, localStorage or production exhibition defaults
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('pos_supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('pos_supabase_key') : null;

  const url = storedUrl || envUrl;
  const key = storedKey || envKey;

  const isConfigured = Boolean(url && key && url.startsWith('http') && !url.includes('placeholder'));
  return { url, key, isConfigured };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      });
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export function resetSupabaseClient(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pos_supabase_url', url);
    localStorage.setItem('pos_supabase_key', key);
  }
  try {
    supabaseInstance = createClient(url, key);
  } catch (e) {
    supabaseInstance = null;
  }
  return supabaseInstance;
}

