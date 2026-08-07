import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ArenaScreen from '../screens/Arena/ArenaScreen';
import ArenaSetupScreen from '../screens/Arena/ArenaSetupScreen';
import ActiveArenaSessionScreen from '../screens/Arena/ActiveArenaSessionScreen';
import ArenaSummaryScreen from '../screens/Arena/ArenaSummaryScreen';

const Stack = createNativeStackNavigator();

export default function ArenaNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      {/* Mode choice → customisation → session → summary. */}
      <Stack.Screen name="ArenaHome" component={ArenaScreen} />
      <Stack.Screen name="ArenaSetup" component={ArenaSetupScreen} />
      <Stack.Screen
        name="ActiveArenaSession"
        component={ActiveArenaSessionScreen}
        // Leaving a live session is a decision, not a swipe — the screen asks.
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="ArenaSummary"
        component={ArenaSummaryScreen}
        // The session is gone by this point; swiping back would land on nothing.
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
