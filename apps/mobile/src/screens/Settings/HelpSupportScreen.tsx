import React from 'react';
import { Linking } from 'react-native';
import { Bug, HelpCircle, Mail, MessageSquarePlus } from 'lucide-react-native';

import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';
import { CAUTION, GRADIENT, POSITIVE, PROFILE_TINT } from '../../theme/ui';

const SUPPORT_EMAIL = 'support@hudjee.com';

export default function HelpSupportScreen({ navigation }: any) {
  const showToast = useToastStore((s) => s.showToast);

  const mail = (subject: string) => async () => {
    HapticService.light();
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      // No mail client configured — a dead tap is worse than the address.
      showToast(`Email us at ${SUPPORT_EMAIL}`, 'info');
    }
  };

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Settings"
        title="Help and support"
        subtitle="Something unclear, something broken, or something you wish existed."
        onBack={() => navigation.goBack()}
      />

      <SettingsGroup label="Answers" index={0}>
        <SettingsRow
          icon={HelpCircle}
          accent={GRADIENT[1]}
          title="FAQ"
          subtitle="How the adaptive engine picks your questions, and the rest"
          onPress={() => {
            HapticService.light();
            showToast('The FAQ is not published yet', 'info');
          }}
        />
      </SettingsGroup>

      <SettingsGroup
        label="Get in touch"
        index={1}
        footnote={`All three open your mail app addressed to ${SUPPORT_EMAIL}. Include your account email and we will find your session history.`}
      >
        <SettingsRow
          icon={Mail}
          title="Contact support"
          subtitle="A question about your account or a session"
          onPress={mail('HudJee support')}
        />
        <SettingsRow
          icon={Bug}
          accent={CAUTION}
          title="Report a bug"
          subtitle="Something behaved wrongly"
          onPress={mail('HudJee bug report')}
        />
        <SettingsRow
          icon={MessageSquarePlus}
          accent={POSITIVE}
          title="Send feedback"
          subtitle="Something you want, or something you would change"
          onPress={mail('HudJee feedback')}
        />
      </SettingsGroup>
    </Screen>
  );
}
