import React, { useState } from 'react';
import { Download, Eraser, NotebookPen, RotateCcw, Trash2 } from 'lucide-react-native';

import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import DestructiveActionSheet from '../../components/settings/DestructiveActionSheet';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';
import { GRADIENT, PROFILE_TINT } from '../../theme/ui';

type SheetId = 'chapter' | 'all' | 'mistakes' | 'account';

const SHEETS: Record<
  SheetId,
  { title: string; description: string; confirmText: string; typed?: string; toast: string }
> = {
  chapter: {
    title: 'Reset chapter progress',
    description:
      'Clears your mastery estimate for one chapter and puts its questions back in rotation as if you had never seen them. Your XP and streak are untouched.',
    confirmText: 'Reset chapter',
    toast: 'Chapter progress reset',
  },
  all: {
    title: 'Reset all progress',
    description:
      'Clears every mastery estimate across all three subjects. The adaptive engine starts from scratch and will need a few sessions to find your level again. XP, streak and challenge history stay.',
    confirmText: 'Reset everything',
    toast: 'All progress reset',
  },
  mistakes: {
    title: 'Clear mistake notebook',
    description:
      'Empties the notebook. The questions themselves stay in the bank — you just stop being reminded which ones caught you out.',
    confirmText: 'Clear notebook',
    toast: 'Mistake notebook cleared',
  },
  account: {
    title: 'Delete account',
    description:
      'Permanently deletes your account, your progress, your challenge history and your friendships. This cannot be undone and there is no grace period.',
    confirmText: 'Delete account',
    typed: 'DELETE',
    toast: 'Account deletion requested',
  },
};

// Reset and delete are separated by more than a divider: the three reversible
// resets sit in one group, and the one irreversible action gets its own, so the
// tap that ends your account is never the one below the tap that clears a
// chapter.

export default function DataResetScreen({ navigation }: any) {
  const [sheet, setSheet] = useState<SheetId | null>(null);
  // The sheet takes 200ms to slide out. Reading its copy from `sheet` would
  // blank the title and body the instant it starts leaving, so the last opened
  // id is held separately and the content stays put until it is gone.
  const [shown, setShown] = useState<SheetId>('chapter');
  const showToast = useToastStore((s) => s.showToast);

  const open = (id: SheetId) => {
    HapticService.light();
    setShown(id);
    setSheet(id);
  };

  const confirm = () => {
    if (!sheet) return;
    HapticService.heavy();
    const { toast } = SHEETS[sheet];
    setSheet(null);
    showToast(toast, 'success');
  };

  const active = SHEETS[shown];

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Settings"
        title="Data and reset"
        subtitle="Take your data out, put your progress back to zero, or close the account."
        onBack={() => navigation.goBack()}
      />

      <SettingsGroup label="Your data" index={0}>
        <SettingsRow
          icon={Download}
          accent={GRADIENT[1]}
          title="Export my data"
          subtitle="Everything we hold, as a file you can keep"
          onPress={() => {
            HapticService.light();
            showToast('Data export started — we will email you the file', 'success');
          }}
        />
      </SettingsGroup>

      <SettingsGroup
        label="Reset progress"
        index={1}
        footnote="Resets affect the adaptive engine's picture of you. They do not touch XP, streaks or anything social."
      >
        <SettingsRow
          icon={RotateCcw}
          title="Reset chapter progress"
          subtitle="One chapter, back to unseen"
          onPress={() => open('chapter')}
        />
        <SettingsRow
          icon={Eraser}
          title="Reset all progress"
          subtitle="Every subject, back to unseen"
          onPress={() => open('all')}
        />
        <SettingsRow
          icon={NotebookPen}
          title="Clear mistake notebook"
          subtitle="Empty the review list"
          onPress={() => open('mistakes')}
        />
      </SettingsGroup>

      <SettingsGroup label="Danger zone" index={2}>
        <SettingsRow
          icon={Trash2}
          tone="danger"
          title="Delete my account"
          subtitle="Permanent, immediate, unrecoverable"
          onPress={() => open('account')}
        />
      </SettingsGroup>

      <DestructiveActionSheet
        visible={sheet !== null}
        title={active.title}
        description={active.description}
        confirmText={active.confirmText}
        confirmIsTyped={Boolean(active.typed)}
        typedWord={active.typed}
        onConfirm={confirm}
        onCancel={() => setSheet(null)}
      />
    </Screen>
  );
}
