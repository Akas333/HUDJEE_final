import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { 
  Nunito_400Regular, 
  Nunito_500Medium, 
  Nunito_600SemiBold, 
  Nunito_700Bold, 
  Nunito_800ExtraBold,
  Nunito_900Black 
} from '@expo-google-fonts/nunito';

import AppNavigator from './src/navigation/AppNavigator';
import Toast from './src/components/Toast';
import { View, ActivityIndicator } from 'react-native';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        Nunito_400Regular,
        Nunito_500Medium,
        Nunito_600SemiBold,
        Nunito_700Bold,
        Nunito_800ExtraBold,
        Nunito_900Black,

      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#8B5CF6" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
