import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { PROFILE_TINT } from '../../theme/ui';

export default function ConnectToWebScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Settings"
      title="Connect to web"
      blurb="Use HudJee in a browser with this account signed in."
      tint={PROFILE_TINT}
      planned={[
        "Pair a browser by scanning a code",
        "Practice history stays in sync",
        "Sign the browser out from here",
      ]}
    />
  );
}
