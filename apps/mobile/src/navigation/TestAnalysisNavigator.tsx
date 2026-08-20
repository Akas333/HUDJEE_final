import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TestAnalysisScreen from '../screens/TestAnalysis/TestAnalysisScreen';
import QuestionJourneyScreen from '../screens/TestAnalysis/QuestionJourneyScreen';
import PerformanceAnalysisScreen from '../screens/TestAnalysis/PerformanceAnalysisScreen';
import AttemptQualityScreen from '../screens/TestAnalysis/AttemptQualityScreen';
import TimeAnalysisScreen from '../screens/TestAnalysis/TimeAnalysisScreen';
import QuestionWiseAnalysisScreen from '../screens/TestAnalysis/QuestionWiseAnalysisScreen';
import AISummaryScreen from '../screens/TestAnalysis/AISummaryScreen';
import PracticeMistakeQuestionsScreen from '../screens/TestAnalysis/PracticeMistakeQuestionsScreen';
import PostAnalysisNotesScreen from '../screens/TestAnalysis/PostAnalysisNotesScreen';
import { BG } from '../theme/ui';

/**
 * Everything downstream of a finished session.
 *
 * Every screen takes the same params, and each one loads the analysis itself
 * through `AnalysisFrame` rather than receiving it down the stack — so a link
 * straight into, say, the time breakdown works without having gone through the
 * hub first.
 */
export type AnalysisStackParams = {
  sessionId: string;
  /** What the student ran — a chapter or concept name, for the header. */
  title?: string;
};

export type TestAnalysisStackParamList = {
  TestAnalysisScreen: AnalysisStackParams;
  QuestionJourneyScreen: AnalysisStackParams;
  PerformanceAnalysisScreen: AnalysisStackParams;
  AttemptQualityScreen: AnalysisStackParams;
  TimeAnalysisScreen: AnalysisStackParams;
  QuestionWiseAnalysisScreen: AnalysisStackParams;
  AISummaryScreen: AnalysisStackParams;
  PracticeMistakeQuestionsScreen: AnalysisStackParams;
  PostAnalysisNotesScreen: AnalysisStackParams;
};

const Stack = createNativeStackNavigator<TestAnalysisStackParamList>();

export default function TestAnalysisNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BG } }}>
      <Stack.Screen name="TestAnalysisScreen" component={TestAnalysisScreen} />
      <Stack.Screen name="QuestionJourneyScreen" component={QuestionJourneyScreen} />
      <Stack.Screen name="PerformanceAnalysisScreen" component={PerformanceAnalysisScreen} />
      <Stack.Screen name="AttemptQualityScreen" component={AttemptQualityScreen} />
      <Stack.Screen name="TimeAnalysisScreen" component={TimeAnalysisScreen} />
      <Stack.Screen name="QuestionWiseAnalysisScreen" component={QuestionWiseAnalysisScreen} />
      <Stack.Screen name="AISummaryScreen" component={AISummaryScreen} />
      <Stack.Screen
        name="PracticeMistakeQuestionsScreen"
        component={PracticeMistakeQuestionsScreen}
      />
      <Stack.Screen name="PostAnalysisNotesScreen" component={PostAnalysisNotesScreen} />
    </Stack.Navigator>
  );
}
