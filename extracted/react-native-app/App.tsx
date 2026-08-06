import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { theme } from './src/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeFirebaseNativeServices } from './src/services/firebaseNative';

export default function App() {
  React.useEffect(() => {
    initializeFirebaseNativeServices();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
