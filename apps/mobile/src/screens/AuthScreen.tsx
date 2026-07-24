import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  // Google Auth Setup
  // NOTE: You will need to setup Google Cloud credentials and put the client IDs here
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID',
    iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID',
    androidClientId: 'YOUR_GOOGLE_ANDROID_CLIENT_ID',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      supabase.auth.signInWithIdToken({
        provider: 'google',
        token: id_token,
      });
    }
  }, [response]);

  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // handle that the user canceled the sign-in flow
      } else {
        // handle other errors
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/refee/logo 1.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Supercharge your JEE prep with AI</Text>
      </View>

      <View style={styles.authContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.googleButton]} 
          onPress={() => promptAsync()}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.appleButton]} 
          onPress={signInWithApple}
        >
          <Text style={styles.appleButtonText}>Continue with Apple</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: 16,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  authContainer: {
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#333333',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
});
