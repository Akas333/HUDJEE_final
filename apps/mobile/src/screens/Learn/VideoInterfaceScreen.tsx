import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { DEFAULT_TINT } from '../../theme/subjects';

export default function VideoInterfaceScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Learn"
      title="Player"
      blurb="The lecture player."
      tint={DEFAULT_TINT}
      planned={[
        "Video with concept markers along the scrubber",
        "Notes pinned to a timestamp",
        "Practise the concept without leaving the lecture",
      ]}
    />
  );
}
