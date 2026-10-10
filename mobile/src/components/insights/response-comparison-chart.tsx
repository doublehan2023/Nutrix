import { Text, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { colors } from '../../../constants/theme';

type ResponseComparisonChartProps = {
  personal: readonly number[];
  population: readonly number[];
  minutes: readonly number[];
};

const chartHeight = 175;
const chartPadding = { bottom: 28, left: 31, right: 8, top: 10 };
const yTicks = [0, 20, 40, 60] as const;

function buildPath(values: readonly number[], toX: (index: number) => number, toY: (value: number) => number) {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`).join(' ');
}

export function ResponseComparisonChart({ personal, population, minutes }: ResponseComparisonChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(220, width - 80);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const toX = (index: number) => chartPadding.left + (index / (minutes.length - 1)) * plotWidth;
  const toY = (value: number) => chartPadding.top + ((60 - value) / 60) * plotHeight;
  const personalSixtyMinuteValue = personal[minutes.indexOf(60)];
  const populationSixtyMinuteValue = population[minutes.indexOf(60)];

  return (
    <View className="app-card mt-4">
      <Text className="app-card-title">Personal vs population response</Text>
      <View className="mt-2 flex-row gap-5">
        <View className="flex-row items-center">
          <View className="mr-2 h-0.5 w-5 bg-copy" />
          <Text className="text-sm text-copy">Population average</Text>
        </View>
        <View className="flex-row items-center">
          <View className="mr-2 h-1 w-5 rounded-full bg-brand" />
          <Text className="text-sm text-copy">This person</Text>
        </View>
      </View>
      <View className="mt-2 items-center">
        <Svg height={chartHeight} width={chartWidth} accessibilityLabel="Personal compared with population glucose response chart">
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
              +{tick}
            </SvgText>
          ))}
          <Path d={buildPath(population, toX, toY)} fill="none" stroke={colors.mutedForeground} strokeDasharray="6 4" strokeWidth={2.5} />
          <Path d={buildPath(personal, toX, toY)} fill="none" stroke={colors.medication} strokeWidth={3.5} />
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
        Rise per 50 g carbs: +{personalSixtyMinuteValue} mg/dL (population +{populationSixtyMinuteValue})
      </Text>
    </View>
  );
}
