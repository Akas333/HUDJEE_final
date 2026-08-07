import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function TestExecutionScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Paper"
      blurb="The paper itself, under exam conditions."
      tint={TEST_TINT}
      planned={[
        "Question palette and per-question timing",
        "Mark for review, and clear response",
        "Submission, with what is still unanswered spelled out",
      ]}
    />
  );
}
