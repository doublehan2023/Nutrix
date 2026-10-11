import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from '@/auth/auth-provider';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();

  function requestSignOut() {
    Alert.alert('Sign out?', 'You will need your email and password to access Nutrix again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView className="app-screen px-5 pt-5">
      <Text className="text-sm font-semibold uppercase tracking-widest text-brand-dark">
        Nutrix
      </Text>
      <Text className="mt-3 text-4xl font-bold tracking-tight text-ink">
        Settings
      </Text>
      <Text className="app-body-copy mt-3">
        Manage your preferences and health-data connections.
      </Text>
      <View className="app-card mt-8">
        <Text className="text-base font-semibold text-ink">
          {user?.name ?? 'Your account'}
        </Text>
        <Text className="mt-1 text-sm text-copy">{user?.email}</Text>
        <View className="mt-3 self-start rounded-full bg-brand-soft px-3 py-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-brand-dark">{user?.role}</Text>
        </View>
      </View>
      <View className="app-card mt-4">
        <Text className="text-base font-semibold text-ink">
          Your preferences
        </Text>
        <Text className="mt-2 text-sm leading-5 text-copy">
          Dietary preferences, glucose data, notifications, and privacy controls
          will live here.
        </Text>
      </View>
      <Pressable accessibilityRole="button" className="app-card mt-4 flex-row items-center justify-between" onPress={() => router.push('/profile')}>
        <View>
          <Text className="text-base font-semibold text-ink">Health profile</Text>
          <Text className="mt-1 text-sm text-copy">Review and edit your questionnaire answers</Text>
        </View>
        <Text className="text-2xl text-brand-dark">›</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={requestSignOut}
        className="mt-6 items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
        <Text className="text-base font-bold text-danger">Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
