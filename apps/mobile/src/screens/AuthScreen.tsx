import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { createSessionFromUrl, signInWithGoogle } from '../lib/googleAuth';
import { isGuestSignInAvailable, signInAsGuest } from '../lib/guestAuth';
import { useToastStore } from '../services/ToastService';

/** Google's four-colour "G", drawn inline so we don't ship a bitmap. */
function GoogleGlyph({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  const handleRedirect = useCallback(
    async (url: string | null) => {
      if (!url || !url.includes('auth/callback')) return;
      try {
        await createSessionFromUrl(url);
      } catch (e: any) {
        showToast(e?.message ?? 'Sign in failed. Please try again.', 'error');
      }
    },
    [showToast]
  );

  // Backstop for the case where Android hands the redirect to the app as a cold
  // deep link instead of returning it through the auth session promise. Without
  // this the student would land back on a blank sign-in screen after a
  // successful Google login.
  useEffect(() => {
    Linking.getInitialURL().then(handleRedirect);
    const sub = Linking.addEventListener('url', ({ url }) => handleRedirect(url));
    return () => sub.remove();
  }, [handleRedirect]);

  const onGooglePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signInWithGoogle();
      // No success toast: AppNavigator swaps to the main tabs via
      // onAuthStateChange, and landing on Home is the confirmation. A banner
      // over the greeting only gets in the way of it. Failures still speak up.
    } catch (e: any) {
      showToast(e?.message ?? 'Sign in failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onGuestPress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signInAsGuest();
      // Silent on success, for the same reason as the Google path above.
    } catch (e: any) {
      showToast(e?.message ?? 'Guest sign in failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E1B4B', '#0B0B0C', '#0B0B0C']}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.8, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.hero}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Practice daily. Rank higher.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.googleButton, loading && styles.googleButtonDisabled]}
          onPress={onGooglePress}
          disabled={loading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          {loading ? (
            <ActivityIndicator color="#1F1F1F" />
          ) : (
            <>
              <GoogleGlyph size={20} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Development only. `__DEV__` is inlined as false in release builds,
            so the bundler drops this branch entirely. */}
        {isGuestSignInAvailable && (
          <TouchableOpacity
            style={[styles.guestButton, loading && styles.googleButtonDisabled]}
            onPress={onGuestPress}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continue as guest, development only"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            <Text style={styles.guestButtonText}>Continue as Guest (dev)</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.hudjeeBgBase,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 72,
    marginBottom: 20,
  },
  tagline: {
    color: colors.hudjeeTextSecondary,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: typography.regular,
  },
  actions: {
    gap: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
    borderRadius: 14,
    // Google's brand guidelines require the light button to stay white.
    backgroundColor: '#FFFFFF',
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontSize: 16,
    fontFamily: typography.semiBold,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  guestButtonText: {
    color: colors.hudjeeTextSecondary,
    fontSize: 15,
    fontFamily: typography.semiBold,
  },
  legal: {
    color: colors.hudjeeTextTertiary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: typography.regular,
  },
});
