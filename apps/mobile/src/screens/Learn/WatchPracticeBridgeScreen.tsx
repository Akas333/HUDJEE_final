import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { DEFAULT_TINT } from '../../theme/subjects';

export default function WatchPracticeBridgeScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Learn"
      title="Watch, then practise"
      blurb="The handover from a lecture to the questions that test it."
      tint={DEFAULT_TINT}
      planned={[
        "The concept you just watched, restated",
        "Questions chosen for that concept alone",
        "Back to the lecture when you are done",
      ]}
    />
  );
}
