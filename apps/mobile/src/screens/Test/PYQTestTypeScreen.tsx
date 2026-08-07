import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function PYQTestTypeScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Previous years"
      blurb="Past JEE papers, sat however you want to sit them."
      tint={TEST_TINT}
      planned={[
        "Full paper, subject-wise or chapter-wise",
        "Mains and Advanced",
        "Year and shift selection",
      ]}
    />
  );
}
