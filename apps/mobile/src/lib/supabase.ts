import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Loud in dev, non-fatal in prod. Without this you get a confusing network
  // error on every auth call instead of being told the env file is missing.
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Copy apps/mobile/.env.example to apps/mobile/.env, fill it in, then restart Metro with `npx expo start -c`.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://dummy.supabase.co',
  supabaseAnonKey ?? 'dummy_key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Must stay false on native: there is no browser URL for the SDK to read.
      // We parse the OAuth redirect ourselves in lib/googleAuth.ts.
      detectSessionInUrl: false,
      // PKCE is the right flow for a mobile client. The auth code returned to
      // the app is useless without the verifier held in AsyncStorage, so an
      // intercepted redirect can't be replayed.
      flowType: 'pkce',
    },
  }
);
