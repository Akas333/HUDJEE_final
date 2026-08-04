import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

// Dismisses the auth browser tab if it is still hanging around when the app
// remounts (e.g. after a Fast Refresh mid-sign-in). Safe to call at module load.
WebBrowser.maybeCompleteAuthSession();

/**
 * Where Google sends the student back to after they pick an account.
 *
 *   Expo Go        -> exp://192.168.x.x:8081/--/auth/callback
 *   Dev / release  -> hudjee://auth/callback   (from `scheme` in app.json)
 *
 * The Expo Go form contains your machine's LAN IP, so it changes when you move
 * to a different network. Every value this can produce must be listed under
 * Supabase -> Authentication -> URL Configuration -> Redirect URLs.
 */
export const redirectTo = makeRedirectUri({ path: 'auth/callback' });

/** Thrown for problems we can show the student directly. */
export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

/**
 * Turns the redirect URL we get back from Google into a real Supabase session.
 *
 * Handles both flows so this keeps working if `flowType` ever changes:
 *  - PKCE (what we use): the URL carries `?code=...`, exchanged for a session.
 *  - Implicit: the URL carries `#access_token=...&refresh_token=...`.
 */
export async function createSessionFromUrl(url: string): Promise<Session | null> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) throw new GoogleAuthError(errorCode);
  if (params.error) {
    throw new GoogleAuthError(params.error_description ?? params.error);
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }

  const { access_token, refresh_token } = params;
  if (!access_token) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
}

/**
 * Opens Google's account chooser in a Chrome Custom Tab and resolves once the
 * student is signed in.
 *
 * Returns `null` if they backed out — that is a normal outcome, not an error,
 * so callers should not surface a message for it.
 *
 * On success this also fires `onAuthStateChange`, which is what AppNavigator
 * listens to in order to swap the Auth stack for the main tabs. Callers do not
 * need to navigate manually.
 */
export async function signInWithGoogle(): Promise<Session | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // We open the browser ourselves so we can await the result.
      skipBrowserRedirect: true,
      // Always show the account chooser. Students often share a phone with a
      // sibling, and silently reusing the last Google account is a bad surprise.
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) throw error;
  if (!data?.url) {
    throw new GoogleAuthError('Could not reach Google. Check your connection and try again.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  // 'cancel' = student pressed back. 'dismiss' = tab closed without a result.
  if (result.type !== 'success') return null;

  return createSessionFromUrl(result.url);
}
