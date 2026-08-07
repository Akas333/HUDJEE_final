import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function PracticeMistakeQuestionsScreen() {
  return (
    <PlaceholderScreen
      eyebrow="After the paper"
      title="Fix the mistakes"
      blurb="Re-attempt only the questions you got wrong."
      tint={TEST_TINT}
      planned={[
        "Every miss from this paper, back to back",
        "The same question, then a variant of it",
        "Anything still wrong goes to the mistake notebook",
      ]}
    />
  );
}
