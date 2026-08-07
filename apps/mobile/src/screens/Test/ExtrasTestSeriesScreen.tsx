import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function ExtrasTestSeriesScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Extras"
      blurb="Papers outside the main course series."
      tint={TEST_TINT}
      planned={[
        "Topic drills and speed papers",
        "Papers you build from your own weak chapters",
        "Anything the course series does not cover",
      ]}
    />
  );
}
