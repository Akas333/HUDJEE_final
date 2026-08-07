import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function TestScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Tests"
      blurb="Mock papers, previous years, and the series that runs with your course."
      tint={TEST_TINT}
      planned={[
        "Course test series",
        "Previous-year papers by exam and year",
        "Extras, and papers you build yourself",
      ]}
    />
  );
}
