import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function PerformanceAnalysisScreen() {
  return (
    <PlaceholderScreen
      eyebrow="After the paper"
      title="Performance"
      blurb="Accuracy, speed, and the trade you made between them."
      tint={TEST_TINT}
      planned={[
        "Accuracy against time spent, per question",
        "Subject-wise strengths and soft spots",
        "How this paper compares with your last few",
      ]}
    />
  );
}
