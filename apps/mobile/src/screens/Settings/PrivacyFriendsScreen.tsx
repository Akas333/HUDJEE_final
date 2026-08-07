import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ban, RefreshCw, UserX } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import EmptyState from '../../components/ui/EmptyState';
import SettingsChoice from '../../components/settings/SettingsChoice';
import SettingsGroup, { GroupLabel } from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';
import { typography } from '../../theme/typography';
import { CHALLENGE_TINT } from '../../theme/challenges';
import {
  enter,
  NEGATIVE,
  PROFILE_TINT,
  RADIUS_INNER,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TEXT,
} from '../../theme/ui';

const REACH_OPTIONS = ['Anyone', 'Friends of friends', 'Nobody'] as const;
type Reach = (typeof REACH_OPTIONS)[number];

const MOCK_BLOCKED = [
  { id: '1', name: 'ToxicUser99' },
  { id: '2', name: 'SpamBot2024' },
];

export default function PrivacyFriendsScreen({ navigation }: any) {
  const [reach, setReach] = useState<Reach>('Anyone');
  const [blocked, setBlocked] = useState(MOCK_BLOCKED);
  const showToast = useToastStore((s) => s.showToast);

  const unblock = (id: string, name: string) => {
    HapticService.light();
    setBlocked((prev) => prev.filter((u) => u.id !== id));
    showToast(`Unblocked ${name}`, 'success');
  };

  const resetInviteCode = () => {
    HapticService.heavy();
    showToast('Invite code reset', 'success');
  };

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Settings"
        title="Privacy and friends"
        subtitle="Who is allowed to reach you, and who has lost the right to."
        onBack={() => navigation.goBack()}
      />

      <SettingsGroup
        label="Friend requests"
        index={0}
        footnote="Blocking someone overrides this — a blocked account cannot reach you however this is set."
      >
        <SettingsChoice
          title="Who can send you a request"
          options={REACH_OPTIONS}
          value={reach}
          onChange={setReach}
          accent={CHALLENGE_TINT}
        />
      </SettingsGroup>

      <SettingsGroup label="Invite code" index={1}>
        <SettingsRow
          icon={RefreshCw}
          title="Reset invite code"
          subtitle="Old code stops working immediately"
          onPress={resetInviteCode}
        />
      </SettingsGroup>

      {blocked.length === 0 ? (
        <Animated.View entering={enter(4)} style={styles.emptyBlock}>
          <GroupLabel>Blocked</GroupLabel>
          <EmptyState
            icon={Ban}
            title="Nobody is blocked"
            body="Block someone from their profile and they show up here, where you can undo it."
          />
        </Animated.View>
      ) : (
        <SettingsGroup label={`Blocked · ${blocked.length}`} index={2}>
          {blocked.map((user) => (
            <SettingsRow
              key={user.id}
              icon={UserX}
              accent={NEGATIVE}
              title={user.name}
              subtitle="Cannot see you or send you anything"
              right={
                <PressableScale
                  scaleTo={0.94}
                  style={styles.unblock}
                  onPress={() => unblock(user.id, user.name)}
                  accessibilityLabel={`Unblock ${user.name}`}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </PressableScale>
              }
            />
          ))}
        </SettingsGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyBlock: { marginBottom: 28 },
  unblock: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS_INNER,
    backgroundColor: SURFACE_STRONG,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  unblockText: { color: TEXT, fontSize: 12, fontFamily: typography.semiBold },
});
