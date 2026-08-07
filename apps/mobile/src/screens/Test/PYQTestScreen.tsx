import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function PYQTestScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Past paper"
      blurb="A single previous-year paper."
      tint={TEST_TINT}
      planned={[
        "The paper exactly as it was sat",
        "The official answer key",
        "Your score against that year's real cutoffs",
      ]}
    />
  );
}
