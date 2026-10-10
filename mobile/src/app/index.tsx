import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';

export default function IndexScreen() {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return <View className="app-screen items-center justify-center"><ActivityIndicator /></View>;
  }

  return <Redirect href={user ? '/(tabs)' : '/(auth)/sign-in'} />;
}
