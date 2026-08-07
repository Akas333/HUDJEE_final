import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function TestAnalysisScreen() {
  return (
    <PlaceholderScreen
      eyebrow="After the paper"
      title="Analysis"
      blurb="What the paper actually says about where you are."
      tint={TEST_TINT}
      planned={[
        "Score, percentile and rank",
        "Subject and chapter breakdown",
        "Where the marks went",
      ]}
    />
  );
}
