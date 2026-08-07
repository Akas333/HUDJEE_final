import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function CourseTestSeriesScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Course tests"
      blurb="The test series that runs alongside your course."
      tint={TEST_TINT}
      planned={[
        "Scheduled papers, with open and close dates",
        "Your score against the rest of the cohort",
        "Re-attempt a closed paper untimed",
      ]}
    />
  );
}
