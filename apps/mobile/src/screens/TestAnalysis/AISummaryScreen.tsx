import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function AISummaryScreen() {
  return (
    <PlaceholderScreen
      eyebrow="After the paper"
      title="Summary"
      blurb="The paper in a few sentences, and what to do about it."
      tint={TEST_TINT}
      planned={[
        "What went right, and what did not",
        "The two or three concepts to fix first",
        "A practice plan built from the result",
      ]}
    />
  );
}
