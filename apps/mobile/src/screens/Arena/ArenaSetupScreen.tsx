import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Layers,
  Minus,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import Skeleton from '../../components/Skeleton';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { DEFAULT_TINT, SUBJECT_COLORS, SubjectKey, tintFor } from '../../theme/subjects';
import {
  ArenaChapterOption,
  ArenaContext,
  ArenaSubjectSelection,
  fetchArenaChapters,
  previewContexts,
} from '../../services/arenaApi';
import {
  ArenaModeId,
  DIVIDER,
  DURATION_PRESETS,
  GAP,
  GUTTER,
  MODE_BY_ID,
  RADIUS,
  SECTION_GAP,
  SUBJECT_LABELS,
  SUBJECT_ORDER,
  SUBJECT_SHORT,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TARGET_PRESETS,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  formatDuration,
} from '../../theme/arena';

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 10) * 40);

const DEFAULT_TARGET = 20;

// ─── small pieces ────────────────────────────────────────────────────────────

function SectionHeader({ title, meta, action }: { title: string; meta?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action || (meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null)}
    </View>
  );
}

function Pill({
  label,
  active,
  accent,
  onPress,
}: {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={[
        styles.pill,
        active && { backgroundColor: `${accent}26`, borderColor: `${accent}66` },
      ]}
    >
      <Text style={[styles.pillText, active && { color: accent, fontFamily: typography.bold }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

function Stepper({
  value,
  onChange,
  step = 5,
  min = 1,
  max = 200,
  suffix,
  accent,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  accent: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <View style={styles.stepper}>
      <PressableScale onPress={() => onChange(clamp(value - step))} scaleTo={0.88} style={styles.stepperButton}>
        <Minus color={TEXT_MUTED} size={15} strokeWidth={2.4} />
      </PressableScale>
      <Text style={[styles.stepperValue, { color: accent }]}>
        {value}
        {suffix ? <Text style={styles.stepperSuffix}>{suffix}</Text> : null}
      </Text>
      <PressableScale onPress={() => onChange(clamp(value + step))} scaleTo={0.88} style={styles.stepperButton}>
        <Plus color={TEXT_MUTED} size={15} strokeWidth={2.4} />
      </PressableScale>
    </View>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function ArenaSetupScreen({ navigation, route }: any) {
  const modeId: ArenaModeId = route.params?.modeId || 'open_run';
  const mode = MODE_BY_ID[modeId];

  const [chapters, setChapters] = useState<Record<SubjectKey, ArenaChapterOption[]>>({
    physics: [],
    chemistry: [],
    maths: [],
  });
  const [loading, setLoading] = useState(true);

  const [enabled, setEnabled] = useState<SubjectKey[]>(['physics']);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<SubjectKey>>(new Set());

  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState('');

  const [totalTarget, setTotalTarget] = useState<number>(30);
  const [customTarget, setCustomTarget] = useState('');

  const [perSubjectTargets, setPerSubjectTargets] = useState(false);
  const [targets, setTargets] = useState<Record<string, number>>({});

  const [customStart, setCustomStart] = useState(false);
  const [startOverrides, setStartOverrides] = useState<Record<string, number>>({});

  const [contexts, setContexts] = useState<Record<string, ArenaContext>>({});
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchArenaChapters();
      if (cancelled) return;
      setChapters(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Subjects that are switched on *and* have something selected under them —
  // the ones that will actually get an engine context.
  const activeSubjects = useMemo(
    () =>
      enabled.filter((subject) =>
        chapters[subject]?.some((chapter) => selected.has(chapter.chapterId))
      ),
    [enabled, chapters, selected]
  );

  const selectionsFor = useCallback(
    (subjects: SubjectKey[]): ArenaSubjectSelection[] =>
      subjects.map((subject) => ({
        subject,
        chapter_ids: (chapters[subject] || [])
          .filter((chapter) => selected.has(chapter.chapterId))
          .map((chapter) => chapter.chapterId),
        target_count: mode.counted && perSubjectTargets ? targets[subject] ?? DEFAULT_TARGET : null,
        start_mastery_pct: customStart ? startOverrides[subject] ?? null : null,
      })),
    [chapters, selected, mode.counted, perSubjectTargets, targets, customStart, startOverrides]
  );

  // The summary panel's numbers. Re-asked whenever the selection changes, with a
  // token so a slow reply for a selection you have moved on from is dropped.
  const previewToken = useRef(0);
  useEffect(() => {
    if (activeSubjects.length === 0) {
      setContexts({});
      return;
    }

    const token = ++previewToken.current;
    const timer = setTimeout(async () => {
      try {
        const result = await previewContexts(selectionsFor(activeSubjects));
        if (previewToken.current !== token) return;
        setPreviewError(null);
        setContexts(
          result.reduce((acc, context) => ({ ...acc, [context.subject]: context }), {})
        );
      } catch (e: any) {
        if (previewToken.current !== token) return;
        setPreviewError(e?.response?.data?.detail || e?.message || 'Could not read your current standing.');
      }
    }, 250);

    return () => clearTimeout(timer);
    // `selectionsFor` closes over every input that changes the answer.
  }, [activeSubjects, selectionsFor]);

  const toggleSubject = (subject: SubjectKey) => {
    setEnabled((prev) => {
      if (prev.includes(subject)) {
        // At least one subject has to stay on.
        if (prev.length === 1) return prev;
        // Turning a subject off takes its chapters out of the session with it.
        setSelected((current) => {
          const next = new Set(current);
          for (const chapter of chapters[subject] || []) next.delete(chapter.chapterId);
          return next;
        });
        return prev.filter((s) => s !== subject);
      }
      return [...prev, subject].sort(
        (a, b) => SUBJECT_ORDER.indexOf(a) - SUBJECT_ORDER.indexOf(b)
      );
    });
  };

  const toggleChapter = (chapterId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const toggleAllIn = (subject: SubjectKey) => {
    const ids = (chapters[subject] || []).map((chapter) => chapter.chapterId);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const selectEverything = () => {
    const ids = enabled.flatMap((subject) => (chapters[subject] || []).map((c) => c.chapterId));
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected(allOn ? new Set() : new Set(ids));
  };

  const toggleCollapsed = (subject: SubjectKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  /** "Split evenly" seeds per-subject targets from the pooled total. */
  const splitEvenly = (subjects: SubjectKey[], total: number) => {
    if (subjects.length === 0) return {};
    const base = Math.floor(total / subjects.length);
    const remainder = total - base * subjects.length;
    return subjects.reduce(
      (acc, subject, i) => ({ ...acc, [subject]: Math.max(1, base + (i < remainder ? 1 : 0)) }),
      {} as Record<string, number>
    );
  };

  const onTogglePerSubject = (on: boolean) => {
    setPerSubjectTargets(on);
    if (on) setTargets(splitEvenly(activeSubjects, totalTarget));
  };

  const onToggleCustomStart = (on: boolean) => {
    setCustomStart(on);
    if (on) {
      // Seed each subject at where it actually stands, so the control starts
      // from the truth rather than from an arbitrary number.
      setStartOverrides(
        activeSubjects.reduce(
          (acc, subject) => ({ ...acc, [subject]: contexts[subject]?.mastery_pct ?? 50 }),
          {} as Record<string, number>
        )
      );
    }
  };

  // In individual mode the pooled total is simply the sum of what the student
  // set per subject — it is not separately editable.
  const effectiveTotal = useMemo(() => {
    if (!mode.counted) return null;
    if (!perSubjectTargets) return totalTarget;
    return activeSubjects.reduce((sum, subject) => sum + (targets[subject] ?? DEFAULT_TARGET), 0);
  }, [mode.counted, perSubjectTargets, totalTarget, activeSubjects, targets]);

  const selectedCount = selected.size;
  const canStart = activeSubjects.length > 0 && selectedCount > 0 && !starting;

  const onStart = async () => {
    if (!canStart) return;
    setStarting(true);

    navigation.navigate('ActiveArenaSession', {
      config: {
        mode: modeId,
        subjects: selectionsFor(activeSubjects),
        activeSubject: activeSubjects[0],
        durationSeconds: mode.timed ? durationMinutes * 60 : null,
        totalTarget: mode.counted ? effectiveTotal : null,
      },
    });

    setStarting(false);
  };

  const tint = activeSubjects.length === 1 ? tintFor(activeSubjects[0]) : DEFAULT_TINT;

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={tint} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header — the mode chip goes back, so changing your mind is one tap. */}
          <Animated.View entering={enter(0)} style={styles.header}>
            <PressableScale scaleTo={0.9} style={styles.iconButton} onPress={() => navigation.goBack()}>
              <ChevronLeft color={TEXT_MUTED} size={20} strokeWidth={2} />
            </PressableScale>

            <PressableScale
              scaleTo={0.95}
              onPress={() => navigation.goBack()}
              style={[styles.modeChip, { borderColor: `${mode.accent}55`, backgroundColor: `${mode.accent}1A` }]}
            >
              <mode.icon color={mode.accent} size={14} strokeWidth={2.2} />
              <Text style={[styles.modeChipText, { color: mode.accent }]}>{mode.name}</Text>
              <ChevronDown color={mode.accent} size={13} strokeWidth={2.2} />
            </PressableScale>
          </Animated.View>

          <Animated.View entering={enter(1)} style={styles.titleBlock}>
            <Text style={styles.title}>Set it up</Text>
            <Text style={styles.subtitle}>{mode.tagline}</Text>
          </Animated.View>

          {/* ── Subjects ── */}
          <Animated.View entering={enter(2)}>
            <SectionHeader title="Subjects" meta="At least one" />
            <View style={styles.subjectRow}>
              {SUBJECT_ORDER.map((subject) => {
                const on = enabled.includes(subject);
                const accent = SUBJECT_COLORS[subject];
                return (
                  <PressableScale
                    key={subject}
                    onPress={() => toggleSubject(subject)}
                    scaleTo={0.94}
                    style={[
                      styles.subjectChip,
                      on && { backgroundColor: `${accent}26`, borderColor: `${accent}66` },
                    ]}
                  >
                    <Text style={[styles.subjectChipText, on && { color: accent, fontFamily: typography.bold }]}>
                      {SUBJECT_SHORT[subject]}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>

          {/* ── Chapters ── */}
          <Animated.View entering={enter(3)} style={{ marginTop: SECTION_GAP }}>
            <SectionHeader
              title="Chapters"
              action={
                <PressableScale onPress={selectEverything} scaleTo={0.94} hitSlop={8}>
                  <Text style={styles.linkText}>Select all</Text>
                </PressableScale>
              }
            />

            {loading ? (
              <View style={{ gap: GAP }}>
                <Skeleton width="100%" height={92} borderRadius={RADIUS} />
                <Skeleton width="100%" height={92} borderRadius={RADIUS} />
              </View>
            ) : (
              <View style={{ gap: GAP }}>
                {enabled.map((subject) => {
                  const list = chapters[subject] || [];
                  const accent = SUBJECT_COLORS[subject];
                  const isCollapsed = collapsed.has(subject);
                  const chosen = list.filter((chapter) => selected.has(chapter.chapterId)).length;

                  return (
                    <View key={subject} style={styles.group}>
                      <PressableScale
                        onPress={() => toggleCollapsed(subject)}
                        scaleTo={0.98}
                        style={styles.groupHeader}
                      >
                        <View style={[styles.groupDot, { backgroundColor: accent }]} />
                        <Text style={styles.groupTitle}>{SUBJECT_LABELS[subject]}</Text>
                        <Text style={styles.groupMeta}>
                          {chosen}/{list.length}
                        </Text>
                        {isCollapsed ? (
                          <ChevronDown color={TEXT_FAINT} size={16} strokeWidth={2} />
                        ) : (
                          <ChevronUp color={TEXT_FAINT} size={16} strokeWidth={2} />
                        )}
                      </PressableScale>

                      {!isCollapsed && (
                        <Animated.View entering={FadeIn.duration(160)}>
                          <View style={styles.groupDivider} />

                          {list.length === 0 ? (
                            <Text style={styles.groupEmpty}>
                              No {SUBJECT_LABELS[subject]} chapters published yet.
                            </Text>
                          ) : (
                            <>
                              <PressableScale
                                onPress={() => toggleAllIn(subject)}
                                scaleTo={0.97}
                                style={styles.selectAllRow}
                              >
                                <Text style={[styles.linkText, { color: accent }]}>
                                  Select all in {SUBJECT_LABELS[subject]}
                                </Text>
                              </PressableScale>

                              {list.map((chapter) => {
                                const on = selected.has(chapter.chapterId);
                                return (
                                  <PressableScale
                                    key={chapter.chapterId}
                                    onPress={() => toggleChapter(chapter.chapterId)}
                                    scaleTo={0.98}
                                    style={styles.chapterRow}
                                  >
                                    <View
                                      style={[
                                        styles.checkbox,
                                        on && { backgroundColor: accent, borderColor: accent },
                                      ]}
                                    >
                                      {on && <Check color="#0B0B0C" size={13} strokeWidth={3} />}
                                    </View>
                                    <Text
                                      style={[styles.chapterName, on && { color: TEXT }]}
                                      numberOfLines={2}
                                    >
                                      {chapter.name}
                                    </Text>
                                    <Text style={styles.chapterMeta}>{chapter.totalQuestions} Qs</Text>
                                  </PressableScale>
                                );
                              })}
                            </>
                          )}
                        </Animated.View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>

          {/* ── Duration (Modes 2 & 4) ── */}
          {mode.timed && (
            <Animated.View entering={enter(4)} style={{ marginTop: SECTION_GAP }}>
              <SectionHeader title="Duration" meta={formatDuration(durationMinutes)} />
              <View style={styles.pillWrap}>
                {DURATION_PRESETS.map((minutes) => (
                  <Pill
                    key={minutes}
                    label={`${minutes}m`}
                    accent={mode.accent}
                    active={durationMinutes === minutes && customDuration === ''}
                    onPress={() => {
                      setDurationMinutes(minutes);
                      setCustomDuration('');
                    }}
                  />
                ))}
                <View style={styles.customField}>
                  <TextInput
                    value={customDuration}
                    onChangeText={(text) => {
                      const digits = text.replace(/[^0-9]/g, '').slice(0, 3);
                      setCustomDuration(digits);
                      const parsed = parseInt(digits, 10);
                      if (!Number.isNaN(parsed) && parsed > 0) setDurationMinutes(parsed);
                    }}
                    keyboardType="number-pad"
                    placeholder="Custom"
                    placeholderTextColor={TEXT_FAINT}
                    style={styles.customInput}
                  />
                  <Text style={styles.customUnit}>min</Text>
                </View>
              </View>
              {/* One clock for the whole session — moving between subjects does
                  not stop it. */}
              <Text style={styles.hint}>One shared clock across every subject you pick.</Text>
            </Animated.View>
          )}

          {/* ── Question target (Modes 3 & 4) ── */}
          {mode.counted && (
            <Animated.View entering={enter(5)} style={{ marginTop: SECTION_GAP }}>
              <SectionHeader
                title="Questions"
                meta={effectiveTotal ? `${effectiveTotal} total` : undefined}
              />

              {!perSubjectTargets && (
                <View style={styles.pillWrap}>
                  {TARGET_PRESETS.map((count) => (
                    <Pill
                      key={count}
                      label={`${count}`}
                      accent={mode.accent}
                      active={totalTarget === count && customTarget === ''}
                      onPress={() => {
                        setTotalTarget(count);
                        setCustomTarget('');
                      }}
                    />
                  ))}
                  <View style={styles.customField}>
                    <TextInput
                      value={customTarget}
                      onChangeText={(text) => {
                        const digits = text.replace(/[^0-9]/g, '').slice(0, 3);
                        setCustomTarget(digits);
                        const parsed = parseInt(digits, 10);
                        if (!Number.isNaN(parsed) && parsed > 0) setTotalTarget(parsed);
                      }}
                      keyboardType="number-pad"
                      placeholder="Custom"
                      placeholderTextColor={TEXT_FAINT}
                      style={styles.customInput}
                    />
                    <Text style={styles.customUnit}>Qs</Text>
                  </View>
                </View>
              )}

              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.toggleTitle}>Set individual subject targets</Text>
                  <Text style={styles.toggleHint}>
                    Each subject locks once it hits its own number.
                  </Text>
                </View>
                <Switch
                  value={perSubjectTargets}
                  onValueChange={onTogglePerSubject}
                  trackColor={{ false: SURFACE_STRONG, true: `${mode.accent}88` }}
                  thumbColor={perSubjectTargets ? mode.accent : '#8B8B93'}
                />
              </View>

              {perSubjectTargets && (
                <Animated.View entering={FadeIn.duration(160)}>
                  {activeSubjects.length === 0 ? (
                    <Text style={styles.hint}>Pick some chapters first.</Text>
                  ) : (
                    <>
                      <PressableScale
                        onPress={() => setTargets(splitEvenly(activeSubjects, totalTarget))}
                        scaleTo={0.96}
                        style={styles.splitButton}
                      >
                        <RotateCcw color={TEXT_MUTED} size={13} strokeWidth={2} />
                        <Text style={styles.splitText}>Split {totalTarget} evenly</Text>
                      </PressableScale>

                      <View style={{ gap: GAP }}>
                        {activeSubjects.map((subject) => (
                          <View key={subject} style={styles.targetRow}>
                            <View style={[styles.groupDot, { backgroundColor: SUBJECT_COLORS[subject] }]} />
                            <Text style={styles.targetLabel}>{SUBJECT_LABELS[subject]}</Text>
                            <Stepper
                              accent={SUBJECT_COLORS[subject]}
                              value={targets[subject] ?? DEFAULT_TARGET}
                              onChange={(next) => setTargets((prev) => ({ ...prev, [subject]: next }))}
                            />
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* ── Where you're walking in ── */}
          <Animated.View entering={enter(6)} style={{ marginTop: SECTION_GAP }}>
            <SectionHeader title="Starting level" meta="Per subject" />

            <View style={styles.summaryCard}>
              {activeSubjects.length === 0 ? (
                <Text style={styles.hint}>Pick at least one chapter to see where you stand.</Text>
              ) : (
                <>
                  {activeSubjects.map((subject, i) => {
                    const context = contexts[subject];
                    const accent = SUBJECT_COLORS[subject];
                    const override = startOverrides[subject];
                    const shown = customStart && override != null ? override : context?.mastery_pct;

                    return (
                      <View key={subject}>
                        {i > 0 && <View style={styles.summaryDivider} />}
                        <View style={styles.summaryRow}>
                          <View style={[styles.groupDot, { backgroundColor: accent }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.summarySubject}>{SUBJECT_LABELS[subject]}</Text>
                            <Text style={styles.summaryMeta}>
                              {context ? `${context.questions_available} questions in pool` : 'Reading…'}
                            </Text>
                          </View>

                          {customStart ? (
                            <Stepper
                              accent={accent}
                              value={override ?? context?.mastery_pct ?? 50}
                              min={0}
                              max={100}
                              onChange={(next) =>
                                setStartOverrides((prev) => ({ ...prev, [subject]: next }))
                              }
                            />
                          ) : (
                            <View style={styles.masteryReadout}>
                              <Text style={[styles.masteryValue, { color: accent }]}>
                                {shown != null ? shown : '—'}
                              </Text>
                              <Text style={styles.masterySuffix}>/100</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  <View style={styles.summaryDivider} />
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.toggleTitle}>Choose my starting level</Text>
                      <Text style={styles.toggleHint}>
                        Off, each subject opens where your history left it.
                      </Text>
                    </View>
                    <Switch
                      value={customStart}
                      onValueChange={onToggleCustomStart}
                      trackColor={{ false: SURFACE_STRONG, true: `${mode.accent}88` }}
                      thumbColor={customStart ? mode.accent : '#8B8B93'}
                    />
                  </View>
                </>
              )}

              {previewError ? <Text style={styles.errorText}>{previewError}</Text> : null}
            </View>
          </Animated.View>

          {/* ── What you're about to start ── */}
          <Animated.View entering={enter(7)} style={{ marginTop: SECTION_GAP }}>
            <View style={styles.recapCard}>
              <View style={styles.recapIcon}>
                <Layers color={TEXT_MUTED} size={17} strokeWidth={1.9} />
              </View>
              <Text style={styles.recapText}>
                {activeSubjects.length === 0
                  ? 'Nothing selected yet.'
                  : [
                      `${activeSubjects.length} subject${activeSubjects.length === 1 ? '' : 's'}`,
                      `${selectedCount} chapter${selectedCount === 1 ? '' : 's'}`,
                      mode.timed ? formatDuration(durationMinutes) : 'no timer',
                      mode.counted && effectiveTotal ? `${effectiveTotal} questions` : 'no limit',
                    ].join(' · ')}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Start bar */}
        <View style={styles.footer}>
          <PressableScale
            onPress={onStart}
            disabled={!canStart}
            scaleTo={0.97}
            style={[
              styles.startButton,
              { backgroundColor: canStart ? mode.accent : SURFACE_STRONG },
            ]}
          >
            {starting ? (
              <ActivityIndicator color="#0B0B0C" />
            ) : (
              <>
                <Text style={[styles.startText, { color: canStart ? '#0B0B0C' : TEXT_FAINT }]}>
                  {canStart ? `Start ${mode.name}` : 'Pick a chapter to start'}
                </Text>
                {canStart && <Play color="#0B0B0C" size={16} fill="#0B0B0C" />}
              </>
            )}
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 26 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  modeChipText: { fontSize: 13, fontFamily: typography.bold, letterSpacing: -0.1 },

  titleBlock: { marginBottom: 30 },
  title: { color: TEXT, fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.4 },
  subtitle: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.regular, marginTop: 6, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
  linkText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.semiBold },

  subjectRow: { flexDirection: 'row', gap: GAP },
  subjectChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
    alignItems: 'center',
  },
  subjectChipText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.semiBold, letterSpacing: 1 },

  group: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    overflow: 'hidden',
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 16 },
  groupDot: { width: 7, height: 7, borderRadius: 3.5 },
  groupTitle: { flex: 1, color: TEXT, fontSize: 15, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  groupMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
  groupDivider: { height: 1, backgroundColor: SURFACE_BORDER, marginHorizontal: 18 },
  groupEmpty: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontFamily: typography.regular,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  selectAllRow: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  chapterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterName: { flex: 1, color: TEXT_MUTED, fontSize: 14, fontFamily: typography.regular, lineHeight: 19 },
  chapterMeta: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },

  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  pillText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.semiBold },
  customField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  customInput: {
    color: TEXT,
    fontSize: 13,
    fontFamily: typography.semiBold,
    minWidth: 52,
    paddingVertical: 6,
  },
  customUnit: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  hint: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, marginTop: 12, lineHeight: 18 },
  errorText: { color: '#F87171', fontSize: 12, fontFamily: typography.regular, marginTop: 12 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  toggleTitle: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold },
  toggleHint: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, marginTop: 3, lineHeight: 17 },

  splitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
    marginTop: 16,
    marginBottom: 14,
  },
  splitText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.semiBold },

  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  targetLabel: { flex: 1, color: TEXT, fontSize: 14, fontFamily: typography.semiBold },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: SURFACE_STRONG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: { fontSize: 16, fontFamily: typography.bold, minWidth: 34, textAlign: 'center' },
  stepperSuffix: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },

  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  summaryDivider: { height: 1, backgroundColor: SURFACE_BORDER, marginVertical: 14 },
  summarySubject: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold },
  summaryMeta: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 3 },
  masteryReadout: { flexDirection: 'row', alignItems: 'baseline' },
  masteryValue: { fontSize: 22, fontFamily: typography.bold, letterSpacing: -0.6 },
  masterySuffix: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginLeft: 2 },

  recapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 16,
  },
  recapIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recapText: { flex: 1, color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 19 },

  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACE_BORDER,
    backgroundColor: 'rgba(11,11,12,0.86)',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 16,
    borderRadius: 999,
  },
  startText: { fontSize: 15, fontFamily: typography.bold, letterSpacing: -0.2 },
});
