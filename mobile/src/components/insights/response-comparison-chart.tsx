import { Text, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { colors } from '../../../constants/theme';

type ResponseComparisonChartProps = {
  minutes: readonly number[];
  response: readonly number[];
  sampleSize: number;
};

const chartHeight = 175;
const chartPadding = { bottom: 28, left: 31, right: 8, top: 10 };
function buildPath(values: readonly number[], toX: (index: number) => number, toY: (value: number) => number) {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`).join(' ');
}

export function ResponseComparisonChart({ response, minutes, sampleSize }: ResponseComparisonChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(220, width - 80);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const toX = (index: number) => chartPadding.left + (index / (minutes.length - 1)) * plotWidth;
  const maximum = Math.max(20, Math.ceil(Math.max(...response) / 20) * 20);
  const yTicks = Array.from({ length: 5 }, (_, index) => (maximum / 4) * index);
  const toY = (value: number) => chartPadding.top + ((maximum - value) / maximum) * plotHeight;
  const sixtyMinuteValue = response[minutes.indexOf(60)];

  return (
    <View className="app-card mt-4">
      <Text className="app-card-title">Observed meal response · first 7 days</Text>
      <View className="mt-2 flex-row gap-5">
        <View className="flex-row items-center">
          <View className="mr-2 h-1 w-5 rounded-full" style={{ backgroundColor: colors.medication }} />
          <Text className="text-sm text-copy">Mean observed glucose change</Text>
        </View>
      </View>
      <View className="mt-2 items-center">
        <Svg height={chartHeight} width={chartWidth} accessibilityLabel="Observed glucose response chart">
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
            <SvgText fill={colors.mutedForeground} fontSize={11} key={`label-${tick}`} textAnchor="end" x={chartPadding.left - 5} y={toY(tick) + 4}>
              +{Math.round(tick)}
            </SvgText>
          ))}
          <Path d={buildPath(response, toX, toY)} fill="none" stroke={colors.medication} strokeWidth={3.5} />
          {minutes.map((minute, index) => (
            <SvgText
              fill={colors.mutedForeground}
              fontSize={11}
              key={minute}
              textAnchor={index === 0 ? 'start' : index === minutes.length - 1 ? 'end' : 'middle'}
              x={toX(index)}
              y={chartHeight - 6}>
              {minute} min
            </SvgText>
          ))}
        </Svg>
      </View>
      <Text className="text-sm text-copy">
        Mean observed rise at 60 min: +{sixtyMinuteValue} mg/dL across {sampleSize} complete meal-response windows.
      </Text>
    </View>
  );
}
