import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Question, AnswerResponse } from '../services/api.mock';

// Simple text renderer (replace with a LaTeX renderer later)
const MathText = ({ content, style }: { content: string; style?: any }) => {
  return <Text style={style}>{content}</Text>;
};

interface QuestionCardProps {
  question: Question;
  status: 'loading' | 'answering' | 'correct' | 'incorrect' | 'exhausted' | 'summary';
  selectedOption: number | null;
  answerData: AnswerResponse | null;
  masteryLevel?: number;
  onSelect: (index: number) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onBookmark?: () => void;
  onReport?: () => void;
  onChallenge?: () => void;
}

export default function QuestionCard({
  question,
  status,
  selectedOption,
  answerData,
  masteryLevel = 50,
  onSelect,
  onSubmit,
}: QuestionCardProps) {
  const isAnswering = status === 'answering';
  const isResolved = status === 'correct' || status === 'incorrect';

  return (
    <View style={styles.container}>
      {/* Scrollable question + options area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Question stem */}
        <MathText content={question.prompt} style={styles.questionText} />

        {/* Options Row with Progress Bar */}
        <View style={styles.optionsContainerRow}>
          {/* Options List */}
          <View style={styles.optionsList}>
            {question.options?.map((opt, index) => {
              const isSelected = selectedOption === index;
              const isCorrectOption = isResolved && index === (question as any).correctIndex;

              // Determine border color
              let borderColor = '#2A2A2E';
              if (isCorrectOption && !isAnswering) {
                borderColor = '#34D399';
              } else if (isSelected && status === 'incorrect') {
                borderColor = '#EF4444';
              } else if (isSelected && isAnswering) {
                borderColor = '#047857'; // emerald border when selected
              }

              // Determine background
              let bgColor = '#16161A';
              if (isCorrectOption && !isAnswering) {
                bgColor = 'rgba(52, 211, 153, 0.08)';
              } else if (isSelected && status === 'incorrect') {
                bgColor = 'rgba(239, 68, 68, 0.08)';
              } else if (isSelected && isAnswering) {
                bgColor = 'rgba(105, 240, 174, 0.06)';
              }

              const letter = String.fromCharCode(65 + index) + '.';

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    { backgroundColor: bgColor, borderColor },
                  ]}
                  onPress={() => onSelect(index)}
                  activeOpacity={0.7}
                  disabled={!isAnswering}
                >
                  <Text style={styles.optionLetter}>{letter}</Text>
                  <Text style={styles.optionText}>{opt}</Text>
                  {isCorrectOption && !isAnswering && (
                    <CheckCircle color="#34D399" size={18} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Mastery Progress Bar */}
          <View style={styles.masteryProgressWrapper}>
            <View style={styles.masteryProgressBar}>
              <LinearGradient
                colors={['#80EEC1', '#34D399']}
                style={[styles.masteryProgressFill, { height: `${masteryLevel}%` }]}
              />
            </View>
            <Text style={styles.masteryText}>{masteryLevel}%</Text>
          </View>
        </View>

        {/* Solution view (shown on incorrect) */}
        {status === 'incorrect' && answerData?.solution && (
          <View style={styles.solutionBox}>
            <Text style={styles.solutionTitle}>Solution</Text>
            {answerData.solution.misconception_tag && (
              <View style={styles.misconceptionBox}>
                <Text style={styles.misconceptionText}>
                  💡 {answerData.solution.misconception_tag}
                </Text>
              </View>
            )}
            {answerData.solution.steps.map((step, i) => (
              <Text key={i} style={styles.solutionStep}>
                {i + 1}. {step}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom action area */}
      <View style={styles.bottomBar}>
        {isAnswering ? (
          <TouchableOpacity
            style={[
              styles.submitButton,
              selectedOption === null ? styles.submitButtonDisabled : styles.submitButtonEnabled,
            ]}
            onPress={onSubmit}
            disabled={selectedOption === null}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.submitText,
              selectedOption === null ? styles.submitTextDisabled : styles.submitTextEnabled,
            ]}>Submit</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.swipeHint}>▲ Swipe up for next</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  // ── Question Text ──
  questionText: {
    fontFamily: 'Montserrat_400Regular',
    color: '#E5E5E5',
    fontSize: 18,
    lineHeight: 26,
    marginTop: 24,
    marginBottom: 8,
  },

  // ── Options ──
  optionsContainerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
  },
  optionsList: {
    flex: 1,
    marginRight: 16,
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 64,
  },
  optionLetter: {
    fontFamily: 'Montserrat_400Regular',
    color: '#888',
    fontSize: 16,
    width: 28,
    marginRight: 4,
  },
  optionText: {
    fontFamily: 'Montserrat_400Regular',
    color: '#CCCCCC',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },

  // ── Solution ──
  solutionBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1A1A1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  solutionTitle: {
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#FFF',
    fontSize: 16,
    marginBottom: 12,
  },
  solutionStep: {
    fontFamily: 'Montserrat_500Medium',
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  misconceptionBox: {
    backgroundColor: 'rgba(155, 111, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 111, 255, 0.2)',
  },
  misconceptionText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#A78BFA',
    fontSize: 13,
  },

  // ── Bottom Bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: '#000',
  },
  masteryProgressWrapper: {
    alignItems: 'center',
    width: 36,
  },
  masteryProgressBar: {
    width: 32,
    height: 280,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  masteryProgressFill: {
    width: '100%',
    borderRadius: 8,
    shadowColor: '#80EEC1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
  masteryText: {
    color: '#FFF',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
  },
  submitButton: {
    paddingHorizontal: 44,
    paddingVertical: 14,
    borderRadius: 13, // Matches Figma exact spec
    minWidth: 160,
    alignItems: 'center',
  },
  submitButtonEnabled: {
    backgroundColor: '#80EEC1', // Exact hex from Figma
  },
  submitButtonDisabled: {
    backgroundColor: '#0F291E',
  },
  submitText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
  },
  submitTextEnabled: {
    color: '#000000',
  },
  submitTextDisabled: {
    color: '#246147',
  },
  swipeHint: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#555',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
