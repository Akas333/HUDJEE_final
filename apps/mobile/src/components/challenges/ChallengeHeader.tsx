import React from 'react';

import ScreenHeader from '../ui/ScreenHeader';

// Challenges' header is the app's header — it was simply written here first.
// Kept as a named alias so the ten Social screens read the way they always have,
// while there is only one implementation to keep in step.

export default function ChallengeHeader(props: React.ComponentProps<typeof ScreenHeader>) {
  return <ScreenHeader {...props} />;
}
