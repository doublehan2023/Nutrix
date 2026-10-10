import { Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { colors } from '../../../constants/theme';

export type GlucoseChartData = {
  lowerBound: readonly number[];
  minutes: readonly number[];
  observed: readonly number[];
  predicted: readonly number[];
  upperBound: readonly number[];
};

type PredictionChartProps = {
  data: GlucoseChartData;
  day: number;
};

const yTicks = [80, 100, 120, 140, 160, 180] as const;
const xLabelIndexes = [0, 2, 4, 6, 8] as const;
const chartHeight = 210;
const chartPadding = { bottom: 28, left: 34, right: 8, top: 12 };
const minGlucose = 80;
const maxGlucose = 180;

function buildLinePath(values: readonly number[], toX: (index: number) => number, toY: (value: number) => number) {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`).join(' ');
}

function ChartLegend() {
  return (
    <View className="mt-3 flex-row flex-wrap gap-x-5 gap-y-2">
      <View className="flex-row items-center">
        <View className="mr-2 h-1 w-5 rounded-full bg-medication" />
        <Text className="text-sm text-copy">Predicted</Text>
      </View>
      <View className="flex-row items-center">
        <View className="mr-2 h-1 w-5 rounded-full bg-glucose" />
        <Text className="text-sm text-copy">Observed</Text>
      </View>
      <View className="flex-row items-center">
        <View className="mr-2 h-3 w-4 rounded bg-accent" />
        <Text className="text-sm text-copy">Uncertainty</Text>
      </View>
    </View>
  );
}

export function PredictionChart({ data, day }: PredictionChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(260, width - 88);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const toX = (index: number) => chartPadding.left + (index / (data.minutes.length - 1)) * plotWidth;
  const toY = (value: number) =>
    chartPadding.top + ((maxGlucose - value) / (maxGlucose - minGlucose)) * plotHeight;
  const uncertaintyPath = [
    ...data.upperBound.map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`),
    ...data.lowerBound
      .map((value, index) => ({ index: data.lowerBound.length - 1 - index, value }))
      .map(({ index, value }) => `L ${toX(index)} ${toY(value)}`),
    'Z',
  ].join(' ');

  return (
    <View className="app-card-lg">
      <Text className="text-xl font-semibold text-ink">Predicted vs observed · Day {day}</Text>
      <ChartLegend />
      <View className="mt-2 items-center">
        <Svg height={chartHeight} width={chartWidth} accessibilityLabel={`Predicted and observed glucose chart for Day ${day}`}>
          <Path d={uncertaintyPath} fill={colors.accent} opacity={0.55} />
          {yTicks.map((tick) => (
            <Line
              key={tick}
              stroke={colors.border}
              strokeWidth={1}
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={toY(tick)}
              y2={toY(tick)}
            />
          ))}
          {yTicks.map((tick) => (
            <SvgText
              fill={colors.mutedForeground}
              fontSize={11}
              key={tick}
              textAnchor="end"
              x={chartPadding.left - 6}
              y={toY(tick) + 4}>
              {tick}
            </SvgText>
          ))}
          <Path d={buildLinePath(data.observed, toX, toY)} fill="none" stroke={colors.success} strokeWidth={3} />
          <Path
            d={buildLinePath(data.predicted, toX, toY)}
            fill="none"
            stroke={colors.medication}
            strokeDasharray="7 5"
            strokeLinecap="round"
            strokeWidth={3}
          />
          {xLabelIndexes.map((index) => (
            <SvgText
              fill={colors.mutedForeground}
              fontSize={11}
              key={data.minutes[index]}
              textAnchor="middle"
              x={toX(index)}
              y={chartHeight - 7}>
              {data.minutes[index]} min
            </SvgText>
          ))}
          {xLabelIndexes.map((index) => (
            <Circle
              cx={toX(index)}
              cy={toY(data.predicted[index])}
              fill={colors.medication}
              key={data.minutes[index]}
              r={index === 0 ? 4.5 : 4}
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}
