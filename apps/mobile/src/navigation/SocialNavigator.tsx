import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChallengesScreen from '../screens/Social/ChallengesScreen';
import SolveChallengeScreen from '../screens/Social/SolveChallengeScreen';
import ManageFriendsScreen from '../screens/Social/ManageFriendsScreen';
import LeaderBoardScreen from '../screens/Social/LeaderBoardScreen';

const Stack = createNativeStackNavigator();

export default function SocialNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      <Stack.Screen name="ChallengesHome" component={ChallengesScreen} />
      <Stack.Screen 
        name="SolveChallenge" 
        component={SolveChallengeScreen} 
        options={{ gestureEnabled: false }} 
      />
      <Stack.Screen 
        name="ManageFriends" 
        component={ManageFriendsScreen} 
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="LeaderBoard" component={LeaderBoardScreen} />
    </Stack.Navigator>
  );
}
