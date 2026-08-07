import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function ConnectToPCScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Sit it on a computer"
      blurb="Take the paper on a larger screen, the way the real one is taken."
      tint={TEST_TINT}
      planned={[
        "Pair with a browser session by code",
        "The attempt stays in sync both ways",
        "Hand it back to the phone at any point",
      ]}
    />
  );
}
