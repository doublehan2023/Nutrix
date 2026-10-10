import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/prediction/metric-card';
import { PredictionChart } from '@/components/prediction/prediction-chart';
import { PredictionDrivers } from '@/components/prediction/prediction-drivers';
import { PredictionHeader } from '@/components/prediction/prediction-header';

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

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 pb-12">
        <PredictionHeader onBack={() => router.back()} title="Meal prediction" />
        <PredictionChart data={chartData} day={8} />

        <View className="mt-4 flex-row gap-3">
          <MetricCard label="Peak" unit="mg/dL" value="148" />
          <MetricCard label="Time to peak" unit="min" value="58" />
          <MetricCard label="2h iAUC" unit="mg·min/dL" value="3,420" />
        </View>

        <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
          <Text className="text-base font-semibold text-slate-900">Glucose after meal</Text>
          <Text className="mt-1 text-sm text-slate-500">Predicted · observed</Text>
          <View className="mt-4 flex-row justify-between">
            {comparisonRows.map((row) => (
              <View className="items-center" key={row.minute}>
                <Text className="text-xs text-slate-500">{row.minute}</Text>
                <Text className="mt-1 text-2xl font-semibold text-purple-600">{row.predicted}</Text>
                <Text className="mt-1 text-xs font-medium text-emerald-600">obs {row.observed}</Text>
              </View>
            ))}
          </View>
        </View>

        <PredictionDrivers drivers={drivers} />

        <View className="mt-4 rounded-3xl bg-amber-50 px-5 py-4">
          <Text className="text-base font-semibold text-amber-800">Confidence: moderate · ±11 mg/dL</Text>
          <Text className="mt-1 text-sm leading-5 text-amber-700">Learned from 7 days of personal data.</Text>
        </View>

        <Text className="mt-5 text-center text-xs leading-5 text-slate-500">
          This is a demonstration estimate and not medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
