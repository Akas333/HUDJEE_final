import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChallengesScreen from '../screens/Social/ChallengesScreen';
import { ChallengeComposeScreen } from '../screens/Social/ChallengeComposeScreen';
import ChallengeDetailScreen from '../screens/Social/ChallengeDetailScreen';
import SolveChallengeScreen from '../screens/Social/SolveChallengeScreen';
import ChallengeResultScreen from '../screens/Social/ChallengeResultScreen';
import StreakDetailScreen from '../screens/Social/StreakDetailScreen';
import LeaderBoardScreen from '../screens/Social/LeaderBoardScreen';
import ManageFriendsScreen from '../screens/Social/ManageFriendsScreen';

const Stack = createNativeStackNavigator();

export default function SocialNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      <Stack.Screen name="ChallengesHome" component={ChallengesScreen} />
      <Stack.Screen name="ChallengeCompose" component={ChallengeComposeScreen} />
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <Stack.Screen 
        name="SolveChallenge" 
        component={SolveChallengeScreen} 
        options={{ gestureEnabled: false }} 
      />
      <Stack.Screen name="ChallengeResult" component={ChallengeResultScreen} />
      <Stack.Screen name="StreakDetail" component={StreakDetailScreen} />
      <Stack.Screen name="LeaderBoard" component={LeaderBoardScreen} />
      <Stack.Screen 
        name="ManageFriends" 
        component={ManageFriendsScreen} 
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
