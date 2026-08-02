import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { AccountScreen } from '../screens/Settings/AccountScreen';
import { NotificationsScreen } from '../screens/Settings/NotificationsScreen';
import { PracticePreferencesScreen } from '../screens/Settings/PracticePreferencesScreen';
import PrivacyFriendsScreen from '../screens/Settings/PrivacyFriendsScreen';
import DataResetScreen from '../screens/Settings/DataResetScreen';
import HelpSupportScreen from '../screens/Settings/HelpSupportScreen';
import AboutScreen from '../screens/Settings/AboutScreen';

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  AccountScreen: undefined;
  NotificationsScreen: undefined;
  PracticePreferencesScreen: undefined;
  PrivacyFriendsScreen: undefined;
  DataResetScreen: undefined;
  HelpSupportScreen: undefined;
  AboutScreen: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="AccountScreen" component={AccountScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <Stack.Screen name="PracticePreferencesScreen" component={PracticePreferencesScreen} />
      <Stack.Screen name="PrivacyFriendsScreen" component={PrivacyFriendsScreen} />
      <Stack.Screen name="DataResetScreen" component={DataResetScreen} />
      <Stack.Screen name="HelpSupportScreen" component={HelpSupportScreen} />
      <Stack.Screen name="AboutScreen" component={AboutScreen} />
    </Stack.Navigator>
  );
}
