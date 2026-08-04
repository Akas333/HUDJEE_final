import Constants from 'expo-constants';
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
 *
 * Only used by the browser fallback below — the native flow never leaves the app.
 */
export const redirectTo = makeRedirectUri({ path: 'auth/callback' });

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Expo Go ships a fixed set of native modules and Google Sign-In is not one of
 * them, so there is nothing to link against there.
 */
const isExpoGo = Constants.executionEnvironment === 'storeClient';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

// `undefined` = not resolved yet, `null` = resolved and unavailable.
let cachedModule: GoogleSigninModule | null | undefined;
let configured = false;

/**
 * Resolves the native module, or `null` when it cannot be used.
 *
 * The require is deliberately lazy and guarded: importing it at module scope in
 * Expo Go throws while the JS bundle is still evaluating, which takes down the
 * whole app instead of just the sign-in button.
 */
function getGoogleSignin(): GoogleSigninModule | null {
  if (cachedModule !== undefined) return cachedModule;

  if (isExpoGo || !webClientId) {
    cachedModule = null;
    return null;
  }

  let resolved: GoogleSigninModule | null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    resolved = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    // Not present in this binary (e.g. an older dev client built before the
    // dependency was added). Fall back to the browser flow rather than crash.
    resolved = null;
  }

  cachedModule = resolved;
  return resolved;
}

/** True when this build signs in through the native Google account picker. */
export function isNativeGoogleSignInAvailable(): boolean {
  return getGoogleSignin() !== null;
}

function configureOnce(mod: GoogleSigninModule) {
  if (configured) return;
  mod.GoogleSignin.configure({
    // Supabase verifies the ID token against the client IDs registered for the
    // Google provider, and the token's audience is always the *web* client ID —
    // even when the request comes from Android or iOS.
    webClientId,
    ...(iosClientId ? { iosClientId } : {}),
  });
  configured = true;
}

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
 *
 * Only reachable through the browser fallback; the native flow returns an ID
 * token directly and never round-trips through a URL.
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
 * Native account picker -> Google ID token -> Supabase session.
 *
 * Nothing leaves the app: no browser tab, no redirect URL, and no dependency on
 * the Supabase redirect allow-list.
 */
async function signInNatively(mod: GoogleSigninModule): Promise<Session | null> {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = mod;

  configureOnce(mod);

  try {
    // No-op on iOS. On Android this surfaces the "update Google Play services"
    // prompt rather than failing with an opaque error.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    // The student dismissed the picker — a normal outcome, not an error.
    if (!isSuccessResponse(response)) return null;

    const idToken = response.data.idToken;
    if (!idToken) {
      // Almost always a webClientId that doesn't match the one Supabase knows.
      throw new GoogleAuthError(
        'Google did not return an ID token. Check the Google sign-in configuration.'
      );
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;

    return data.session;
  } catch (e) {
    if (isErrorWithCode(e)) {
      switch (e.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return null;
        case statusCodes.IN_PROGRESS:
          // A picker is already open; let it finish rather than stacking another.
          return null;
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new GoogleAuthError(
            'Google Play services is unavailable or out of date on this device.'
          );
      }
    }
    throw e;
  }
}

/**
 * Browser fallback used in Expo Go, where the native module does not exist.
 *
 * Returns `null` if the student backed out — a normal outcome, not an error.
 */
async function signInViaBrowser(): Promise<Session | null> {
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

/**
 * Signs the student in with Google and resolves once Supabase has a session.
 *
 * Uses the native account picker when the build supports it and falls back to
 * the browser flow in Expo Go, so the same button works in both.
 *
 * Returns `null` if they backed out — that is a normal outcome, not an error,
 * so callers should not surface a message for it.
 *
 * On success this also fires `onAuthStateChange`, which is what AppNavigator
 * listens to in order to swap the Auth stack for the main tabs. Callers do not
 * need to navigate manually.
 */
export async function signInWithGoogle(): Promise<Session | null> {
  const mod = getGoogleSignin();
  return mod ? signInNatively(mod) : signInViaBrowser();
}

/**
 * Signs the student out of Supabase and, on native builds, out of Google too.
 *
 * Without the native half, Google silently reuses the same account on the next
 * sign-in and there is no way to switch — which looks like a broken sign-out.
 */
export async function signOut(): Promise<void> {
  const mod = getGoogleSignin();

  if (mod) {
    try {
      await mod.GoogleSignin.signOut();
    } catch {
      // Clearing the local Supabase session matters more than the Google side,
      // so a failure here must not block sign-out.
    }
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
