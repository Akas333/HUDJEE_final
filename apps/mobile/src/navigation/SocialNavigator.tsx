import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SocialScreen from '../screens/Social/SocialScreen';
import RoomsScreen from '../screens/Social/RoomsScreen';
import LeaderBoardScreen from '../screens/Social/LeaderBoardScreen';
import RecordsScreen from '../screens/Social/RecordsScreen';
import DoubtRoomScreen from '../screens/Social/DoubtRoomScreen';

const Stack = createNativeStackNavigator();

export default function SocialNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      <Stack.Screen name="SocialScreen" component={SocialScreen} />
      <Stack.Screen name="RoomsScreen" component={RoomsScreen} />
      <Stack.Screen name="LeaderBoardScreen" component={LeaderBoardScreen} />
      <Stack.Screen name="RecordsScreen" component={RecordsScreen} />
      <Stack.Screen name="DoubtRoomScreen" component={DoubtRoomScreen} />
    </Stack.Navigator>
  );
}
