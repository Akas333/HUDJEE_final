import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ChallengesScreen from '../screens/Social/ChallengesScreen';
import ChallengeComposeScreen from '../screens/Social/ChallengeComposeScreen';
import ChallengeDetailScreen from '../screens/Social/ChallengeDetailScreen';
import SolveChallengeScreen from '../screens/Social/SolveChallengeScreen';
import ChallengeResultScreen from '../screens/Social/ChallengeResultScreen';
import ChallengeHistoryScreen from '../screens/Social/ChallengeHistoryScreen';
import StreakDetailScreen from '../screens/Social/StreakDetailScreen';
import LeaderBoardScreen from '../screens/Social/LeaderBoardScreen';
import ManageFriendsScreen from '../screens/Social/ManageFriendsScreen';
import FriendProfileScreen from '../screens/Social/FriendProfileScreen';

const Stack = createNativeStackNavigator();

export default function SocialNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}
    >
      <Stack.Screen name="ChallengesHome" component={ChallengesScreen} />
      <Stack.Screen name="ChallengeCompose" component={ChallengeComposeScreen} />
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <Stack.Screen
        name="SolveChallenge"
        component={SolveChallengeScreen}
        // An attempt is locked in one direction: swiping out of it mid-set would
        // leave the clock running on a screen the student can no longer see.
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="ChallengeResult" component={ChallengeResultScreen} />
      <Stack.Screen name="ChallengeHistory" component={ChallengeHistoryScreen} />
      <Stack.Screen name="StreakDetail" component={StreakDetailScreen} />
      <Stack.Screen name="LeaderBoard" component={LeaderBoardScreen} />
      <Stack.Screen name="ManageFriends" component={ManageFriendsScreen} />
      <Stack.Screen name="FriendProfile" component={FriendProfileScreen} />
    </Stack.Navigator>
  );
}
