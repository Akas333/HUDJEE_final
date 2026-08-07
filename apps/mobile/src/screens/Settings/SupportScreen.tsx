import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { PROFILE_TINT } from '../../theme/ui';

export default function SupportScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Settings"
      title="Support"
      blurb="Getting hold of someone when something is wrong."
      tint={PROFILE_TINT}
      planned={[
        "Contact support",
        "Report a bug",
        "Send feedback",
      ]}
    />
  );
}
