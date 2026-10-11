import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import '@/global.css';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/auth/auth-provider';
import { MealDraftProvider } from '@/features/meals/meal-draft-context';
import { HealthQuestionnaireProvider } from '@/features/profile/health-questionnaire-context';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { colors } from '../../constants/theme';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

if (!publishableKey) {
  throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to mobile/.env.');
}

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isReady, user } = useAuth();

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={isReady && Boolean(user)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="health-questionnaire" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="meal-edit" />
          <Stack.Screen name="prediction" />
        </Stack.Protected>
        <Stack.Protected guard={isReady && !user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthProvider>
        <HealthQuestionnaireProvider>
          <MealDraftProvider>
            <RootNavigator />
          </MealDraftProvider>
        </HealthQuestionnaireProvider>
      </AuthProvider>
    </ClerkProvider>
  );
}
