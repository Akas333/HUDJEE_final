import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function TestInstructionsScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Instructions"
      blurb="The rules of the paper, before the clock starts."
      tint={TEST_TINT}
      planned={[
        "Duration, marking scheme and negative marking",
        "The question types in this paper",
        "The declaration you accept before starting",
      ]}
    />
  );
}
