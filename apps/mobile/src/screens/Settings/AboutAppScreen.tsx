import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { PROFILE_TINT } from '../../theme/ui';

export default function AboutAppScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Settings"
      title="About the app"
      blurb="Version, licences and the legal documents."
      tint={PROFILE_TINT}
      planned={[
        "Version and build",
        "Terms and privacy policy",
        "Open-source licences",
      ]}
    />
  );
}
