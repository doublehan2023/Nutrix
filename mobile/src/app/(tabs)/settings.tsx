import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from '@/auth/auth-provider';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();

  function requestSignOut() {
    Alert.alert('Sign out?', 'You will need your email and password to access Nutrix again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 pt-10">
      <Text className="text-sm font-semibold uppercase tracking-widest text-teal-700">
        Nutrix
      </Text>
      <Text className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
        Settings
      </Text>
      <Text className="mt-3 text-base leading-6 text-slate-600">
        Manage your preferences and health-data connections.
      </Text>
      <View className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <Text className="text-base font-semibold text-slate-950">
          {user?.name ?? 'Your account'}
        </Text>
        <Text className="mt-1 text-sm text-slate-600">{user?.email}</Text>
        <View className="mt-3 self-start rounded-full bg-teal-50 px-3 py-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-teal-800">{user?.role}</Text>
        </View>
      </View>
      <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
        <Text className="text-base font-semibold text-slate-950">
          Your preferences
        </Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          Dietary preferences, glucose data, notifications, and privacy controls
          will live here.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={requestSignOut}
        className="mt-6 items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
        <Text className="text-base font-bold text-red-700">Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
