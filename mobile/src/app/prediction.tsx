import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/prediction/metric-card';
import { PredictionChart } from '@/components/prediction/prediction-chart';
import { PredictionDrivers } from '@/components/prediction/prediction-drivers';
import { PredictionHeader } from '@/components/prediction/prediction-header';
import { useMealDraft } from '@/features/meals/meal-draft-context';

const chartData = {
  observed: [106, 115, 134, 149, 153, 143, 126, 116, 110],
  predicted: [105, 113, 128, 141, 148, 141, 128, 118, 112],
  lowerBound: [102, 109, 120, 131, 137, 130, 118, 109, 103],
  upperBound: [109, 120, 136, 153, 160, 154, 138, 126, 119],
  minutes: [0, 15, 30, 45, 60, 75, 90, 105, 120],
} as const;

const comparisonRows = [
  { minute: '30 min', observed: 134, predicted: 128 },
  { minute: '60 min', observed: 152, predicted: 150 },
  { minute: '90 min', observed: 126, predicted: 128 },
  { minute: '120 min', observed: 110, predicted: 112 },
] as const;

const drivers = [
  { label: 'Meal carbohydrates', value: 38 },
  { label: 'Baseline glucose trend', value: 24 },
  { label: 'Time of day', value: 17 },
  { label: 'Heart rate / activity', value: 12 },
  { label: 'Medication timing', value: 9 },
] as const;

export default function PredictionScreen() {
  const router = useRouter();
  const { discardDraft } = useMealDraft();

  function returnHome() {
    discardDraft();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView className="app-screen" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-12">
        <PredictionHeader onBack={() => router.back()} title="Meal prediction" />
        <PredictionChart data={chartData} day={8} />

        <View className="mt-4 flex-row gap-3">
          <MetricCard label="Peak" unit="mg/dL" value="148" />
          <MetricCard label="Time to peak" unit="min" value="58" />
          <MetricCard label="2h iAUC" unit="mg·min/dL" value="3,420" />
        </View>

        <View className="app-card mt-4">
          <Text className="text-base font-semibold text-ink">Glucose after meal</Text>
          <Text className="mt-1 text-sm text-copy">Predicted · observed</Text>
          <View className="mt-4 flex-row justify-between">
            {comparisonRows.map((row) => (
              <View className="items-center" key={row.minute}>
                <Text className="text-xs text-copy">{row.minute}</Text>
                <Text className="mt-1 text-2xl font-semibold text-prediction">{row.predicted}</Text>
                <Text className="mt-1 text-xs font-medium text-glucose">obs {row.observed}</Text>
              </View>
            ))}
          </View>
        </View>

        <PredictionDrivers drivers={drivers} />

        <View className="mt-4 rounded-card bg-status-low px-5 py-4">
          <Text className="text-base font-semibold text-on-secondary">Confidence: moderate · ±11 mg/dL</Text>
          <Text className="mt-1 text-sm leading-5 text-on-secondary">Learned from 7 days of personal data.</Text>
        </View>

        <Text className="mt-5 text-center text-xs leading-5 text-copy">
          This is a demonstration estimate and not medical advice.
        </Text>
        <Pressable accessibilityRole="button" className="app-button-primary mt-5" onPress={returnHome}>
          <Text className="text-lg font-bold text-on-brand">Go back to home page</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
