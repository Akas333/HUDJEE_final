import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TestScreen from '../screens/Test/TestScreen';
import CourseTestSeriesScreen from '../screens/Test/CourseTestSeriesScreen';
import CourseTestScreen from '../screens/Test/CourseTestScreen';
import PYQTestTypeScreen from '../screens/Test/PYQTestTypeScreen';
import PYQTestScreen from '../screens/Test/PYQTestScreen';
import ExtrasTestSeriesScreen from '../screens/Test/ExtrasTestSeriesScreen';
import SyllabusAndReadinessScreen from '../screens/Test/SyllabusAndReadinessScreen';
import TestInstructionsScreen from '../screens/Test/TestInstructionsScreen';
import TestExecutionScreen from '../screens/Test/TestExecutionScreen';
import ConnectToPCScreen from '../screens/Test/ConnectToPCScreen';

const Stack = createNativeStackNavigator();

export default function TestNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      <Stack.Screen name="TestScreen" component={TestScreen} />
      <Stack.Screen name="CourseTestSeriesScreen" component={CourseTestSeriesScreen} />
      <Stack.Screen name="CourseTestScreen" component={CourseTestScreen} />
      <Stack.Screen name="PYQTestTypeScreen" component={PYQTestTypeScreen} />
      <Stack.Screen name="PYQTestScreen" component={PYQTestScreen} />
      <Stack.Screen name="ExtrasTestSeriesScreen" component={ExtrasTestSeriesScreen} />
      <Stack.Screen name="SyllabusAndReadinessScreen" component={SyllabusAndReadinessScreen} />
      <Stack.Screen name="TestInstructionsScreen" component={TestInstructionsScreen} />
      <Stack.Screen name="TestExecutionScreen" component={TestExecutionScreen} />
      <Stack.Screen name="ConnectToPCScreen" component={ConnectToPCScreen} />
    </Stack.Navigator>
  );
}
