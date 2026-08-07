import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function CourseTestScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Course test"
      blurb="One paper from the course series."
      tint={TEST_TINT}
      planned={[
        "Duration, marking scheme and syllabus covered",
        "Start the paper, or review a past attempt",
        "How the cohort did on it",
      ]}
    />
  );
}
