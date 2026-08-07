import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { DEFAULT_TINT } from '../../theme/subjects';

export default function PracticeListScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Practice"
      title="Question sets"
      blurb="The question sets available in this chapter."
      tint={DEFAULT_TINT}
      planned={[
        "Sets by exam and by difficulty",
        "Questions attempted and accuracy per set",
        "Resume a set you left half finished",
      ]}
    />
  );
}
