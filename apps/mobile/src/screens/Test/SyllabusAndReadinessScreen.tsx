import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { TEST_TINT } from '../../theme/ui';

export default function SyllabusAndReadinessScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Test"
      title="Syllabus and readiness"
      blurb="What a paper covers, and how ready you are to sit it."
      tint={TEST_TINT}
      planned={[
        "Chapter-by-chapter coverage for this paper",
        "A readiness estimate per subject",
        "The gaps worth closing before you start",
      ]}
    />
  );
}
