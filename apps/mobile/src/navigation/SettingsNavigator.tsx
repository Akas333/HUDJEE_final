import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import EditProfileScreen from '../screens/Settings/EditProfileScreen';
import ConnectToWebScreen from '../screens/Settings/ConnectToWebScreen';
import SupportScreen from '../screens/Settings/SupportScreen';
import AboutAppScreen from '../screens/Settings/AboutAppScreen';

const Stack = createNativeStackNavigator();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
      <Stack.Screen name="ConnectToWebScreen" component={ConnectToWebScreen} />
      <Stack.Screen name="SupportScreen" component={SupportScreen} />
      <Stack.Screen name="AboutAppScreen" component={AboutAppScreen} />
    </Stack.Navigator>
  );
}
