import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { DEFAULT_TINT } from '../../theme/subjects';

export default function LecturesListScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Learn"
      title="Lectures"
      blurb="Every lecture in this chapter, and what you have already watched."
      tint={DEFAULT_TINT}
      planned={[
        "Full-length lectures and one-shots",
        "Watch progress per lecture",
        "Resume wherever you stopped",
      ]}
    />
  );
}
