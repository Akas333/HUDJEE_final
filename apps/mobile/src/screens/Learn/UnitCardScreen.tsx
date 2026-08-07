import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { DEFAULT_TINT } from '../../theme/subjects';

export default function UnitCardScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Learn"
      title="Unit"
      blurb="A unit's chapters, with how far into each of them you are."
      tint={DEFAULT_TINT}
      planned={[
        "Chapters in the unit, in syllabus order",
        "Coverage and mastery for each one",
        "Straight into practice for any chapter",
      ]}
    />
  );
}
