import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { DEFAULT_TINT } from '../../theme/subjects';

export default function PracticeInterfaceScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Practice"
      title="Question set"
      blurb="Working through a fixed set, rather than an adaptive one."
      tint={DEFAULT_TINT}
      planned={[
        "Question, options and a place to work",
        "Mark for review, and skip",
        "Solution and explanation after each answer",
      ]}
    />
  );
}
