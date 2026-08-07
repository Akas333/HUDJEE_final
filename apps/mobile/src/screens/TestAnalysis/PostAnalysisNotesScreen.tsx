import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function PostAnalysisNotesScreen() {
  return (
    <PlaceholderScreen
      eyebrow="After the paper"
      title="Notes"
      blurb="What you want to remember before you sit the next one."
      tint={TEST_TINT}
      planned={[
        "Your own note against each mistake",
        "Pinned to the concept rather than the paper",
        "Surfaced again before the next test",
      ]}
    />
  );
}
