import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PracticeScreen from '../screens/Learn/PracticeScreen';
import UnitCardScreen from '../screens/Learn/UnitCardScreen';
import ChapterCardScreen from '../screens/Learn/ChapterCardScreen';
import LecturesListScreen from '../screens/Learn/LecturesListScreen';
import VideoInterfaceScreen from '../screens/Learn/VideoInterfaceScreen';
import PracticeListScreen from '../screens/Learn/PracticeListScreen';
import PracticeInterfaceScreen from '../screens/Learn/PracticeInterfaceScreen';
import WatchPracticeBridgeScreen from '../screens/Learn/WatchPracticeBridgeScreen';
import AdaptiveSessionScreen from '../screens/Learn/AdaptiveSessionScreen';

const Stack = createNativeStackNavigator();

export default function PracticeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      <Stack.Screen name="PracticeScreen" component={PracticeScreen} />
      <Stack.Screen name="AdaptiveSessionScreen" component={AdaptiveSessionScreen} />
      <Stack.Screen name="UnitCardScreen" component={UnitCardScreen} />
      <Stack.Screen name="ChapterCardScreen" component={ChapterCardScreen} />
      <Stack.Screen name="LecturesListScreen" component={LecturesListScreen} />
      <Stack.Screen name="VideoInterfaceScreen" component={VideoInterfaceScreen} />
      <Stack.Screen name="PracticeListScreen" component={PracticeListScreen} />
      <Stack.Screen name="PracticeInterfaceScreen" component={PracticeInterfaceScreen} />
      <Stack.Screen name="WatchPracticeBridgeScreen" component={WatchPracticeBridgeScreen} />
    </Stack.Navigator>
  );
}
