import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from '@expo-google-fonts/geist';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../lib/theme';

// Keep splash visible while fonts load and store hydrates
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAppStore((s) => s.hydrate);

  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hydrate store data, then reveal the app
      hydrate().finally(() => SplashScreen.hideAsync());
    }
  }, [fontsLoaded, fontError, hydrate]);

  // Hold render until fonts are ready so no fallback-font flash
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="history"
          options={{
            headerShown: true,
            headerBackTitle: 'Atrás',
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTitleStyle: {
              fontFamily: 'Geist_600SemiBold',
              fontSize: 17,
              color: colors.ink,
            },
          }}
        />
      </Stack>
    </>
  );
}
