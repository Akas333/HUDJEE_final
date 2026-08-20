import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check } from 'lucide-react-native';

import AnalysisFrame from '../../components/analysis/AnalysisFrame';
import SectionHeader from '../../components/ui/SectionHeader';
import { SessionAnalysis } from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import {
  GAP,
  POSITIVE,
  RADIUS_INNER,
  SECTION_GAP,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  enter,
} from '../../theme/ui';

/**
 * Three lines, written while the paper is still warm.
 *
 * Kept on the device rather than in Postgres: there is no table for this, and
 * adding one to hold three strings would mean a migration, a policy and a grant
 * for something that is only ever read by the person who wrote it. The trade is
 * that the notes do not follow a student to a new phone, which is worth saying
 * on the screen rather than discovering.
 */

const SLOTS = 3;
const MAX_LENGTH = 180;
/** Long enough that a pause between words is not a write, short enough to survive a back-swipe. */
const SAVE_DEBOUNCE_MS = 600;

const keyFor = (sessionId: string) => `analysis-notes:${sessionId}`;

export default function PostAnalysisNotesScreen({ route }: any) {
  const { sessionId, title } = route.params || {};

  return (
    <AnalysisFrame
      sessionId={sessionId}
      title="What you learned"
      eyebrow={title || 'Analysis'}
      subtitle="Up to three things, in your own words, before you forget them."
    >
      {(a: SessionAnalysis) => <Notes analysis={a} />}
    </AnalysisFrame>
  );
}

function Notes({ analysis }: { analysis: SessionAnalysis }) {
  const [notes, setNotes] = useState<string[]>(Array(SLOTS).fill(''));
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(keyFor(analysis.sessionId))
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotes(Array.from({ length: SLOTS }, (_, i) => parsed[i] || ''));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [analysis.sessionId]);

  const update = (index: number, value: string) => {
    const next = notes.map((n, i) => (i === index ? value : n));
    setNotes(next);
    setSaved(false);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      AsyncStorage.setItem(keyFor(analysis.sessionId), JSON.stringify(next))
        .then(() => setSaved(true))
        .catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  };

  return (
    <>
      <SectionHeader
        title="Your learnings"
        meta={saved ? 'Saved' : `${notes.filter(Boolean).length}/${SLOTS}`}
      />

      {notes.map((note, i) => (
        <Animated.View key={i} entering={enter(2 + i)} style={styles.field}>
          <View style={styles.fieldHead}>
            <Text style={styles.fieldLabel}>{i + 1}</Text>
            {note.trim().length > 0 ? <Check color={POSITIVE} size={14} strokeWidth={2.5} /> : null}
          </View>
          <TextInput
            value={note}
            onChangeText={(v) => update(i, v)}
            placeholder={PROMPTS[i]}
            placeholderTextColor={TEXT_FAINT}
            style={styles.input}
            multiline
            maxLength={MAX_LENGTH}
          />
        </Animated.View>
      ))}

      <Animated.View entering={enter(6)} style={styles.section}>
        <Text style={styles.prompt}>{seedFrom(analysis)}</Text>
      </Animated.View>

      <Animated.View entering={enter(7)} style={styles.section}>
        <Text style={styles.footnote}>
          These stay on this device. They are not synced, so they will not follow you to a new
          phone.
        </Text>
      </Animated.View>
    </>
  );
}

const PROMPTS = [
  'A formula or step you got wrong…',
  'Something you will do differently next time…',
  'A question type worth practising…',
];

/** A starting point drawn from the run, so the page is not blank. */
function seedFrom(a: SessionAnalysis): string {
  const worstTopic = a.topics.filter((t) => t.asked >= 2)[0];
  if (a.quality.wasted >= 2) {
    return `Stuck? You answered ${a.quality.wasted} questions wrong in under the time they were worth — what made you commit that early?`;
  }
  if (worstTopic && worstTopic.accuracyPct < 60) {
    return `Stuck? ${worstTopic.topic || worstTopic.chapter} came out at ${worstTopic.accuracyPct}%. What specifically went wrong there?`;
  }
  return 'Stuck? Write down the one step you would want to see again if this question came back in an exam.';
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 14,
    marginBottom: GAP,
    gap: 8,
  },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1 },
  input: {
    color: TEXT,
    fontSize: 14,
    fontFamily: typography.regular,
    lineHeight: 21,
    minHeight: 56,
    textAlignVertical: 'top',
    padding: 0,
  },

  section: { marginTop: SECTION_GAP - 12 },
  prompt: { color: TEXT_MUTED, fontSize: 12.5, fontFamily: typography.regular, lineHeight: 20 },
  footnote: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, lineHeight: 19 },
});
