import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { PROFILE_TINT } from '../../theme/ui';

export default function EditProfileScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Settings"
      title="Edit profile"
      blurb="Your name, your photo and how you appear to friends."
      tint={PROFILE_TINT}
      planned={[
        "Display name and avatar",
        "What friends can see",
        "Target exam and year",
      ]}
    />
  );
}
