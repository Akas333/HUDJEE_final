import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsInput from '../../components/settings/SettingsInput';
import SettingsRow from '../../components/settings/SettingsRow';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';
import { typography } from '../../theme/typography';
import { GRADIENT, PROFILE_TINT, SURFACE_STRONG, TEXT_FAINT } from '../../theme/ui';

// The save affordance lives in the header rather than at the bottom of the form:
// there are three fields, the screen never scrolls, and a button pinned below
// the fold on a screen with no fold is just a button you have to look for.

export function AccountScreen() {
  const navigation = useNavigation<any>();
  const showToast = useToastStore((s) => s.showToast);
  const account = useAuthStore((s) => s.user ?? s.session?.user ?? null);

  const initial = useMemo(
    () => ({
      name: '',
      contact: account?.email ?? '',
      targetYear: '',
    }),
    [account?.email]
  );

  const [form, setForm] = useState(initial);
  const dirty =
    form.name !== initial.name ||
    form.contact !== initial.contact ||
    form.targetYear !== initial.targetYear;

  const set = (key: keyof typeof form) => (next: string) =>
    setForm((prev) => ({ ...prev, [key]: next }));

  const handleSave = () => {
    if (!dirty) return;
    HapticService.success();
    showToast('Account details saved', 'success');
  };

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Settings"
        title="Account"
        subtitle="How you appear across practice, challenges and the leaderboard."
        onBack={() => navigation.goBack()}
        action={
          <PressableScale
            scaleTo={0.92}
            disabled={!dirty}
            onPress={handleSave}
            style={[styles.save, !dirty && styles.saveIdle]}
            accessibilityLabel="Save account details"
          >
            <Check color={dirty ? '#0B0B0E' : TEXT_FAINT} size={16} strokeWidth={2.6} />
            <Text style={[styles.saveText, !dirty && styles.saveTextIdle]}>Save</Text>
          </PressableScale>
        }
      />

      <SettingsGroup label="Profile" index={0}>
        <SettingsInput
          label="Name"
          value={form.name}
          onChangeText={set('name')}
          placeholder="Your name"
          autoCapitalize="words"
        />
        <SettingsInput
          label="Contact"
          value={form.contact}
          onChangeText={set('contact')}
          placeholder="Email or phone"
          keyboardType="email-address"
        />
        <SettingsInput
          label="Target exam year"
          value={form.targetYear}
          onChangeText={set('targetYear')}
          placeholder="e.g. 2027"
          keyboardType="number-pad"
          maxLength={4}
          hint="Used to pace your syllabus coverage, nothing else."
        />
      </SettingsGroup>

      <SettingsGroup
        label="Sign-in"
        index={1}
        footnote="Google is the only sign-in method. Changing the contact above does not change the account you sign in with."
      >
        <SettingsRow
          title="Linked method"
          value={account?.is_anonymous ? 'Guest' : 'Google'}
          right={<View />}
        />
      </SettingsGroup>
    </Screen>
  );
}

export default AccountScreen;

const styles = StyleSheet.create({
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    backgroundColor: GRADIENT[0],
  },
  saveIdle: { backgroundColor: SURFACE_STRONG },
  saveText: { color: '#0B0B0E', fontSize: 13, fontFamily: typography.bold },
  saveTextIdle: { color: TEXT_FAINT },
});
