import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function QuestionWiseAnalysisScreen() {
  return (
    <PlaceholderScreen
      eyebrow="After the paper"
      title="Question by question"
      blurb="Every question, what you answered, and what it cost."
      tint={TEST_TINT}
      planned={[
        "Your answer against the key",
        "Time spent on each question",
        "The solution, and the concept behind it",
      ]}
    />
  );
}
