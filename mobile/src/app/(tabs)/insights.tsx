import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InsightsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 pt-10">
      <Text className="text-sm font-semibold uppercase tracking-widest text-teal-700">
        Nutrix
      </Text>
      <Text className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
        Insights
      </Text>
      <Text className="mt-3 text-base leading-6 text-slate-600">
        Find patterns in your meals and glucose responses.
      </Text>
      <View className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <Text className="text-base font-semibold text-slate-950">
          Insights will grow with you
        </Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          Log meals and connect glucose data to uncover personalized trends.
        </Text>
      </View>
    </SafeAreaView>
  );
}
