import React from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ExternalLink, Flame, Pencil, Swords, TrendingUp } from 'lucide-react-native';

import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import SettingsToggle from '../../components/settings/SettingsToggle';
import { useSettingsStore } from '../../store/settingsStore';
import { CAUTION, GRADIENT, POSITIVE, PROFILE_TINT } from '../../theme/ui';
import { CHALLENGE_TINT } from '../../theme/challenges';

// The old version of this screen threw a "Stay on track" modal over itself on
// every single open, with a "Turn on notifications" button that turned nothing
// on. A pre-prompt you cannot get past and that does not do the thing it offers
// is worse than no pre-prompt. What replaces it is the honest version: the four
// switches, and one row that takes you to where the real permission lives.

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { notifications, updateNotification } = useSettingsStore();

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Settings"
        title="Notifications"
        subtitle="Four reasons we will interrupt you. Turn off the ones that are not worth it."
        onBack={() => navigation.goBack()}
      />

      <SettingsGroup label="Keeping momentum" index={0}>
        <SettingsToggle
          icon={Flame}
          accent={CAUTION}
          title="Streak reminders"
          subtitle="Only when the day is nearly out and the streak is live"
          value={notifications.streak}
          onValueChange={(v) => updateNotification('streak', v)}
        />
        <SettingsToggle
          icon={Pencil}
          accent={GRADIENT[1]}
          title="Daily practice reminder"
          subtitle="One nudge at your usual practice time"
          value={notifications.practice}
          onValueChange={(v) => updateNotification('practice', v)}
        />
      </SettingsGroup>

      <SettingsGroup label="Other people" index={1}>
        <SettingsToggle
          icon={Swords}
          accent={CHALLENGE_TINT}
          title="Challenge activity"
          subtitle="Someone challenges you, or answers one of yours"
          value={notifications.challenge}
          onValueChange={(v) => updateNotification('challenge', v)}
        />
        <SettingsToggle
          icon={TrendingUp}
          accent={POSITIVE}
          title="Arena rating changes"
          subtitle="When a session moves your rating"
          value={notifications.arena}
          onValueChange={(v) => updateNotification('arena', v)}
        />
      </SettingsGroup>

      <SettingsGroup
        label="System"
        index={2}
        footnote="These switches only choose which notifications we send. Whether the phone shows them at all is decided in system settings."
      >
        <SettingsRow
          icon={ExternalLink}
          title="Open system notification settings"
          onPress={() => Linking.openSettings()}
        />
      </SettingsGroup>
    </Screen>
  );
}

export default NotificationsScreen;
