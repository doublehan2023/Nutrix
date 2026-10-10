import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 pt-10">
      <Text className="text-sm font-semibold uppercase tracking-widest text-teal-700">Nutrix</Text>
      <Text className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Settings</Text>
      <Text className="mt-3 text-base leading-6 text-slate-600">
        Manage your preferences and health-data connections.
      </Text>
      <View className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <Text className="text-base font-semibold text-slate-950">Your preferences</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          Dietary preferences, glucose data, notifications, and privacy controls will live here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
