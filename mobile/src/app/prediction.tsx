import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

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

const yTicks = [80, 100, 120, 140, 160, 180] as const;
const xLabelIndexes = [0, 2, 4, 6, 8] as const;
const chartHeight = 210;
const chartPadding = { bottom: 28, left: 34, right: 8, top: 12 };
const minGlucose = 80;
const maxGlucose = 180;

function buildLinePath(values: readonly number[], toX: (index: number) => number, toY: (value: number) => number) {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`).join(' ');
}

function GlucoseChart() {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(260, width - 88);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const toX = (index: number) => chartPadding.left + (index / (chartData.minutes.length - 1)) * plotWidth;
  const toY = (value: number) =>
    chartPadding.top + ((maxGlucose - value) / (maxGlucose - minGlucose)) * plotHeight;
  const uncertaintyPath = [
    ...chartData.upperBound.map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`),
    ...chartData.lowerBound
      .map((value, index) => ({ index: chartData.lowerBound.length - 1 - index, value }))
      .map(({ index, value }) => `L ${toX(index)} ${toY(value)}`),
    'Z',
  ].join(' ');

  return (
    <Svg height={chartHeight} width={chartWidth} accessibilityLabel="Predicted and observed glucose chart for Day 8">
      <Path d={uncertaintyPath} fill="#ead5ff" opacity={0.9} />
      {yTicks.map((tick) => (
        <Line
          key={tick}
          stroke="#e2e8f0"
          strokeWidth={1}
          x1={chartPadding.left}
          x2={chartWidth - chartPadding.right}
          y1={toY(tick)}
          y2={toY(tick)}
        />
      ))}
      {yTicks.map((tick) => (
        <SvgText
          fill="#94a3b8"
          fontSize={11}
          key={tick}
          textAnchor="end"
          x={chartPadding.left - 6}
          y={toY(tick) + 4}>
          {tick}
        </SvgText>
      ))}
      <Path d={buildLinePath(chartData.observed, toX, toY)} fill="none" stroke="#10b981" strokeWidth={3} />
      <Path
        d={buildLinePath(chartData.predicted, toX, toY)}
        fill="none"
        stroke="#9f24f2"
        strokeDasharray="7 5"
        strokeLinecap="round"
        strokeWidth={3}
      />
      {xLabelIndexes.map((index) => (
        <SvgText
          fill="#94a3b8"
          fontSize={11}
          key={chartData.minutes[index]}
          textAnchor="middle"
          x={toX(index)}
          y={chartHeight - 7}>
          {chartData.minutes[index]} min
        </SvgText>
      ))}
      {xLabelIndexes.map((index) => (
        <Circle
          cx={toX(index)}
          cy={toY(chartData.predicted[index])}
          fill="#9f24f2"
          key={chartData.minutes[index]}
          r={index === 0 ? 4.5 : 4}
        />
      ))}
    </Svg>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View className="flex-1 rounded-3xl bg-white p-4 shadow-sm">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{value}</Text>
      <Text className="mt-1 text-xs text-slate-500">{unit}</Text>
    </View>
  );
}

export default function PredictionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 pb-12">
        <View className="flex-row items-center py-5">
          <Pressable
            accessibilityLabel="Back to Today"
            accessibilityRole="button"
            className="mr-3 h-10 w-10 items-center justify-center rounded-full active:bg-slate-200"
            onPress={() => router.back()}>
            <Text className="-mt-1 text-4xl font-light leading-none text-slate-900">‹</Text>
          </Pressable>
          <Text className="text-3xl font-semibold tracking-tight text-slate-950">Meal prediction</Text>
        </View>

        <View className="rounded-[30px] bg-white p-5 shadow-sm">
          <Text className="text-xl font-semibold text-slate-900">Predicted vs observed · Day 8</Text>
          <View className="mt-3 flex-row flex-wrap gap-x-5 gap-y-2">
            <View className="flex-row items-center">
              <View className="mr-2 h-1 w-5 rounded-full bg-purple-600" />
              <Text className="text-sm text-slate-500">Predicted</Text>
            </View>
            <View className="flex-row items-center">
              <View className="mr-2 h-1 w-5 rounded-full bg-emerald-500" />
              <Text className="text-sm text-slate-500">Observed</Text>
            </View>
            <View className="flex-row items-center">
              <View className="mr-2 h-3 w-4 rounded bg-purple-200" />
              <Text className="text-sm text-slate-500">Uncertainty</Text>
            </View>
          </View>
          <View className="mt-2 items-center">
            <GlucoseChart />
          </View>
        </View>

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

        <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
          <Text className="text-lg font-semibold text-slate-900">Top drivers for this prediction</Text>
          <View className="mt-4 gap-2">
            {drivers.map((driver, index) => (
              <View className="flex-row items-center" key={driver.label}>
                <Text className="w-44 text-sm text-slate-500">{driver.label}</Text>
                <View className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <View
                    className="h-full rounded-full"
                    style={{ backgroundColor: index === 0 ? '#2861f5' : '#7fa0f9', width: `${driver.value}%` }}
                  />
                </View>
                <Text className="ml-3 w-9 text-right text-sm font-medium text-slate-800">{driver.value}%</Text>
              </View>
            ))}
          </View>
        </View>

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
