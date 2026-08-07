import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Accessibility, Vibrate, Volume2 } from 'lucide-react-native';

import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SettingsChoice from '../../components/settings/SettingsChoice';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsToggle from '../../components/settings/SettingsToggle';
import { useSettingsStore } from '../../store/settingsStore';
import { GRADIENT, POSITIVE, PROFILE_TINT } from '../../theme/ui';

const SESSION_LENGTHS = [10, 20, 30] as const;

export function PracticePreferencesScreen() {
  const navigation = useNavigation<any>();
  const { practicePrefs, updatePracticePref } = useSettingsStore();

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Settings"
        title="Practice"
        subtitle="How a session feels, and how long one runs by default."
        onBack={() => navigation.goBack()}
      />

      <SettingsGroup label="Feedback" index={0}>
        <SettingsToggle
          icon={Volume2}
          accent={GRADIENT[1]}
          title="Sound effects"
          subtitle="The tick on a correct answer, and the one that is not"
          value={practicePrefs.sound}
          onValueChange={(v) => updatePracticePref('sound', v)}
        />
        <SettingsToggle
          icon={Vibrate}
          accent={GRADIENT[0]}
          title="Haptics"
          subtitle="A tap under every control you press"
          value={practicePrefs.haptics}
          onValueChange={(v) => updatePracticePref('haptics', v)}
        />
      </SettingsGroup>

      <SettingsGroup
        label="Motion"
        index={1}
        footnote="Reduced motion keeps every screen and control exactly where it is — nothing slides, scales or springs."
      >
        <SettingsToggle
          icon={Accessibility}
          accent={POSITIVE}
          title="Reduce motion"
          subtitle="Cut the entrance animations and card springs"
          value={practicePrefs.reduceMotion}
          onValueChange={(v) => updatePracticePref('reduceMotion', v)}
        />
      </SettingsGroup>

      <SettingsGroup
        label="Sessions"
        index={2}
        footnote="Arena and Challenges set their own length — this is the default for adaptive practice only."
      >
        <SettingsChoice
          title="Default session length"
          subtitle="Where the adaptive session starts before you change it"
          options={SESSION_LENGTHS}
          value={practicePrefs.defaultSessionLength as (typeof SESSION_LENGTHS)[number]}
          onChange={(next) => updatePracticePref('defaultSessionLength', next)}
          format={(minutes) => `${minutes} min`}
          accent={GRADIENT[0]}
        />
      </SettingsGroup>
    </Screen>
  );
}

export default PracticePreferencesScreen;
