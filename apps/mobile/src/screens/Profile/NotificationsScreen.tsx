import React from 'react';
import { BellOff, Settings2 } from 'lucide-react-native';
import Animated from 'react-native-reanimated';

import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import EmptyState from '../../components/ui/EmptyState';
import { enter, GRADIENT, PROFILE_TINT } from '../../theme/ui';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';

// The bell in the Home and Arena headers used to land on a page that said
// "NotificationsScreen" over a "Go Back" button. There is no notification feed
// behind it yet — so this says that, and puts the one thing you can actually do
// from here within reach.

export default function NotificationsScreen({ navigation }: any) {
  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle="Streak warnings, challenge activity and rating changes land here."
        onBack={() => navigation.goBack()}
      />

      <Animated.View entering={enter(2)} style={{ marginBottom: 28 }}>
        <EmptyState
          icon={BellOff}
          title="Nothing waiting"
          body="You are up to date. Anything that needs you — a challenge you have not answered, a streak about to lapse — shows up here first."
          accent={GRADIENT[1]}
        />
      </Animated.View>

      <SettingsGroup
        label="Preferences"
        index={1}
        footnote="Turning something off here stops the notification, not the thing it was about — your streak still lapses, quietly."
      >
        <SettingsRow
          icon={Settings2}
          title="Choose what we notify you about"
          subtitle="Streaks, practice reminders, challenges, rating"
          onPress={() =>
            navigation.navigate('SettingsStack', { screen: 'NotificationsScreen' })
          }
        />
      </SettingsGroup>
    </Screen>
  );
}
