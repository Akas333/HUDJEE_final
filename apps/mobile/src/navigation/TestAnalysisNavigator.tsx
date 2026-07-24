import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TestAnalysisScreen from '../screens/TestAnalysis/TestAnalysisScreen';
import PerformanceAnalysisScreen from '../screens/TestAnalysis/PerformanceAnalysisScreen';
import QuestionWiseAnalysisScreen from '../screens/TestAnalysis/QuestionWiseAnalysisScreen';
import AISummaryScreen from '../screens/TestAnalysis/AISummaryScreen';
import PracticeMistakeQuestionsScreen from '../screens/TestAnalysis/PracticeMistakeQuestionsScreen';
import PostAnalysisNotesScreen from '../screens/TestAnalysis/PostAnalysisNotesScreen';

const Stack = createNativeStackNavigator();

export default function TestAnalysisNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      <Stack.Screen name="TestAnalysisScreen" component={TestAnalysisScreen} />
      <Stack.Screen name="PerformanceAnalysisScreen" component={PerformanceAnalysisScreen} />
      <Stack.Screen name="QuestionWiseAnalysisScreen" component={QuestionWiseAnalysisScreen} />
      <Stack.Screen name="AISummaryScreen" component={AISummaryScreen} />
      <Stack.Screen name="PracticeMistakeQuestionsScreen" component={PracticeMistakeQuestionsScreen} />
      <Stack.Screen name="PostAnalysisNotesScreen" component={PostAnalysisNotesScreen} />
    </Stack.Navigator>
  );
}
