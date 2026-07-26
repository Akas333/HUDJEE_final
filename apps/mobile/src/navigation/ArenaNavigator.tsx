import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ArenaScreen from '../screens/Arena/ArenaScreen';
import ActiveArenaSessionScreen from '../screens/Arena/ActiveArenaSessionScreen';

const Stack = createNativeStackNavigator();

export default function ArenaNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      <Stack.Screen name="ArenaHome" component={ArenaScreen} />
      <Stack.Screen 
        name="ActiveArenaSession" 
        component={ActiveArenaSessionScreen} 
        options={{ gestureEnabled: false }} // Prevent swipe back during active session
      />
    </Stack.Navigator>
  );
}
