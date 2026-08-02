import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import AuthNavigator from './AuthNavigator';
import TestAnalysisNavigator from './TestAnalysisNavigator';
import SettingsNavigator from './SettingsNavigator';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  TestAnalysisStack: undefined;
  SettingsStack: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, setSession, isInitialized, setInitialized } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setInitialized(true);
      })
      .catch((err) => {
        console.error('Supabase getSession error:', err);
        setInitialized(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isInitialized) {
    return null; // Or a loading splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen name="TestAnalysisStack" component={TestAnalysisNavigator} />
        <Stack.Screen name="SettingsStack" component={SettingsNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
