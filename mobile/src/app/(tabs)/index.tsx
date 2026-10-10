import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TodayScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 pt-10">
      <Text className="text-sm font-semibold uppercase tracking-widest text-teal-700">Nutrix</Text>
      <Text className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Today</Text>
      <Text className="mt-3 text-base leading-6 text-slate-600">
        Your meal and glucose forecast will appear here.
      </Text>
      <View className="mt-8 rounded-3xl border border-teal-100 bg-teal-50 p-6">
        <Text className="text-base font-semibold text-teal-950">No forecast yet</Text>
        <Text className="mt-2 text-sm leading-5 text-teal-900">
          Log a meal to see its expected glucose response.
        </Text>
      </View>
    </SafeAreaView>
  );
}
