import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * Guest sign-in for development.
 *
 * Uses Supabase anonymous auth rather than a faked local session, so the guest
 * is a real row in `auth.users`: the `on_auth_user_created` trigger fires, a
 * profile exists, and RLS behaves exactly as it will for a signed-in student.
 * A stubbed session would pass every RLS policy vacuously and hide precisely
 * the bugs this is meant to catch.
 *
 * Gated on `__DEV__` so it cannot reach a release build. `__DEV__` is inlined
 * as `false` by Metro in production, which lets the bundler drop the call and
 * the button that reaches it.
 */
export const isGuestSignInAvailable = __DEV__;

/** Thrown for problems we can show directly. */
export class GuestAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuestAuthError';
  }
}

export async function signInAsGuest(): Promise<Session | null> {
  if (!__DEV__) {
    throw new GuestAuthError('Guest sign-in is disabled in release builds.');
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    // The provider is off by default on every Supabase project.
    if (error.message?.toLowerCase().includes('anonymous')) {
      throw new GuestAuthError(
        'Anonymous sign-ins are disabled. Enable them in Supabase → Authentication → Sign In / Providers.'
      );
    }
    throw error;
  }

  return data.session;
}
