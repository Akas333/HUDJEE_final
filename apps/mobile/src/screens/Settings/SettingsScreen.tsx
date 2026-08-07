import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import {
  Bell,
  Database,
  Info,
  LifeBuoy,
  LogOut,
  Shield,
  Sliders,
  User,
} from 'lucide-react-native';

import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import { signOut } from '../../lib/googleAuth';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../services/ToastService';
import { typography } from '../../theme/typography';
import { enter, GRADIENT, PROFILE_TINT, TEXT, TEXT_FAINT, TEXT_MUTED } from '../../theme/ui';

// Settings is the quietest screen in the app and should look it: the same
// gutter, wash and card system as every tab, with the colour turned almost all
// the way down. Only two things here are allowed a hue — the account identity at
// the top, and the way out at the bottom.

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const showToast = useToastStore((s) => s.showToast);
  const [signingOut, setSigningOut] = React.useState(false);

  const account = user ?? session?.user ?? null;
  const email = account?.email ?? null;
  const isGuest = account?.is_anonymous === true;
  const initial = (email ?? 'H').trim().charAt(0).toUpperCase();

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      // AppNavigator swaps back to the Auth stack via onAuthStateChange.
    } catch (e: any) {
      showToast(e?.message ?? 'Could not sign out. Please try again.', 'error');
      setSigningOut(false);
    }
  };

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Your account"
        title="Settings"
        onBack={() => navigation.goBack()}
        leading={
          <Animated.View entering={enter(2)} style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.identityName} numberOfLines={1}>
                {isGuest ? 'Guest session' : email ?? 'Signed in'}
              </Text>
              <Text style={styles.identityMeta}>
                {isGuest ? 'Progress stays on this device' : 'Signed in with Google'}
              </Text>
            </View>
          </Animated.View>
        }
      />

      <SettingsGroup label="Account" index={0}>
        <SettingsRow
          icon={User}
          title="Account"
          subtitle="Name, contact and target year"
          onPress={() => navigation.navigate('AccountScreen')}
        />
        <SettingsRow
          icon={Bell}
          title="Notifications"
          subtitle="What we are allowed to interrupt you for"
          onPress={() => navigation.navigate('NotificationsScreen')}
        />
      </SettingsGroup>

      <SettingsGroup label="Practice" index={1}>
        <SettingsRow
          icon={Sliders}
          title="Practice preferences"
          subtitle="Sound, haptics, motion and session length"
          onPress={() => navigation.navigate('PracticePreferencesScreen')}
        />
      </SettingsGroup>

      <SettingsGroup label="Privacy and data" index={2}>
        <SettingsRow
          icon={Shield}
          title="Privacy and friends"
          subtitle="Who can reach you, and who cannot"
          onPress={() => navigation.navigate('PrivacyFriendsScreen')}
        />
        <SettingsRow
          icon={Database}
          title="Data and reset"
          subtitle="Export, reset progress, delete account"
          onPress={() => navigation.navigate('DataResetScreen')}
        />
      </SettingsGroup>

      <SettingsGroup label="Support" index={3}>
        <SettingsRow
          icon={LifeBuoy}
          title="Help and support"
          onPress={() => navigation.navigate('HelpSupportScreen')}
        />
        <SettingsRow
          icon={Info}
          title="About"
          value="2.0.0"
          onPress={() => navigation.navigate('AboutScreen')}
        />
      </SettingsGroup>

      <SettingsGroup
        index={4}
        footnote={
          isGuest
            ? 'Signing out of a guest session ends it for good — there is no way back into this progress.'
            : undefined
        }
      >
        <SettingsRow
          icon={LogOut}
          accent={TEXT_MUTED}
          title={signingOut ? 'Signing out…' : 'Sign out'}
          disabled={signingOut}
          onPress={handleSignOut}
          right={<View />}
        />
      </SettingsGroup>
    </Screen>
  );
}

export default SettingsScreen;

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 30,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${GRADIENT[0]}1F`,
    borderWidth: 1,
    borderColor: `${GRADIENT[0]}3D`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: GRADIENT[0], fontSize: 20, fontFamily: typography.bold },
  identityText: { flex: 1, gap: 3 },
  identityName: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold },
  identityMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
});
