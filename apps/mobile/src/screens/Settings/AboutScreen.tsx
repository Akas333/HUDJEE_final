import React from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { FileText, ShieldCheck, Star } from 'lucide-react-native';

import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';
import { typography } from '../../theme/typography';
import {
  enter,
  GOLD,
  PROFILE_TINT,
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../../theme/ui';

const VERSION = '2.0.0';
const BUILD = '42';

export default function AboutScreen({ navigation }: any) {
  const showToast = useToastStore((s) => s.showToast);

  const openDoc = (name: string, url: string) => async () => {
    HapticService.light();
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      showToast(`${name} is not published yet`, 'info');
    }
  };

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Settings"
        title="About"
        onBack={() => navigation.goBack()}
        leading={
          <Animated.View entering={enter(2)} style={styles.markCard}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Adaptive JEE practice</Text>

            <View style={styles.versionRow}>
              <View style={styles.versionPill}>
                <Text style={styles.versionText}>Version {VERSION}</Text>
              </View>
              <View style={styles.versionPill}>
                <Text style={styles.versionText}>Build {BUILD}</Text>
              </View>
            </View>
          </Animated.View>
        }
      />

      <SettingsGroup label="Legal" index={1}>
        <SettingsRow
          icon={FileText}
          title="Terms of service"
          onPress={openDoc('The terms', 'https://hudjee.com/terms')}
        />
        <SettingsRow
          icon={ShieldCheck}
          title="Privacy policy"
          onPress={openDoc('The privacy policy', 'https://hudjee.com/privacy')}
        />
      </SettingsGroup>

      <SettingsGroup label="If you like it" index={2}>
        <SettingsRow
          icon={Star}
          accent={GOLD}
          title="Rate HudJee"
          subtitle="Takes a moment, helps more than you would think"
          onPress={() => {
            HapticService.light();
            showToast('Store listing is not live yet', 'info');
          }}
        />
      </SettingsGroup>

      <Animated.View entering={enter(5)}>
        <Text style={styles.colophon}>Built for students sitting JEE.</Text>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  markCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 28,
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: { width: 150, height: 38, tintColor: TEXT },
  tagline: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontFamily: typography.regular,
    marginTop: 12,
  },
  versionRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  versionText: { color: TEXT_MUTED, fontSize: 11, fontFamily: typography.medium },
  colophon: {
    color: TEXT_FAINT,
    fontSize: 12,
    fontFamily: typography.regular,
    textAlign: 'center',
    marginTop: 4,
  },
});
