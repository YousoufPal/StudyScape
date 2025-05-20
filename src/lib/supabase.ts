// src/lib/supabase.ts
import 'react-native-url-polyfill/auto'; // Required for Supabase to work in React Native
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'; // Ensure SupabaseClientOptions is imported if used
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Adapter for Expo SecureStore to be used by Supabase for session persistence
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    console.log('[Supabase Storage Adapter] getItem called for key:', key); // DEBUG
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    console.log('[Supabase Storage Adapter] setItem called for key:', key); // DEBUG
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    console.log('[Supabase Storage Adapter] removeItem called for key:', key); // DEBUG
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseOptions: SupabaseClientOptions<"public"> = { // Replace "public" with your schema if different
  auth: {
    storage: ExpoSecureStoreAdapter, // This is where it's passed
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    // @ts-ignore 
    WebSocket: global.WebSocket,
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);