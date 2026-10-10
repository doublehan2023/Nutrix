import { Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';

import type { HistoryDay, HistorySeriesPoint } from '@/data/history';

type HistoryTimelineChartProps = {
  day: HistoryDay;
};

const chartHeight = 180;
const chartPadding = { bottom: 28, left: 30, right: 8, top: 10 };
const yTicks = [60, 100, 140, 180] as const;
const xTicks = [0, 6, 12, 18, 24] as const;

function makePath(points: readonly HistorySeriesPoint[], toX: (hour: number) => number, toY: (value: number) => number) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point.hour)} ${toY(point.value)}`).join(' ');
}

function LegendItem({ color, label, diamond = false }: { color: string; diamond?: boolean; label: string }) {
  return (
    <View className="flex-row items-center">
      <View
        className={diamond ? 'mr-1.5 h-2.5 w-2.5 rotate-45' : 'mr-1.5 h-3 w-3 rounded-full'}
        style={{ backgroundColor: color }}
      />
      <Text className="text-xs text-slate-500">{label}</Text>
    </View>
  );
}

export function HistoryTimelineChart({ day }: HistoryTimelineChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(220, width - 80);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const toX = (hour: number) => chartPadding.left + (hour / 24) * plotWidth;
  const toY = (value: number) => chartPadding.top + ((180 - value) / 120) * plotHeight;

  return (
    <View className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
      <Text className="text-lg font-semibold text-slate-900">
        Day {day.id.slice(1)} · glucose, heart rate, meals
      </Text>
      <View className="mt-2 items-center">
        <Svg height={chartHeight} width={chartWidth} accessibilityLabel={`24-hour history chart for ${day.id}`}>
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
              key={`label-${tick}`}
              textAnchor="end"
              x={chartPadding.left - 5}
              y={toY(tick) + 4}>
              {tick}
            </SvgText>
          ))}
          <Path d={makePath(day.heartRate, toX, toY)} fill="none" stroke="#fb7185" strokeWidth={2} />
          <Path d={makePath(day.glucose, toX, toY)} fill="none" stroke="#10b981" strokeWidth={3} />
          {day.events.map((event, index) => {
            const x = toX(event.hour);
            const y = toY(event.value);

            if (event.kind === 'meal') {
              return <Circle cx={x} cy={y} fill="#f59e0b" key={`${event.kind}-${index}`} r={5} />;
            }

            return (
              <Polygon
                fill="#7c2ae8"
                key={`${event.kind}-${index}`}
                points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`}
              />
            );
          })}
          {xTicks.map((tick) => (
            <SvgText
              fill="#94a3b8"
              fontSize={11}
              key={`time-${tick}`}
              textAnchor={tick === 0 ? 'start' : tick === 24 ? 'end' : 'middle'}
              x={toX(tick)}
              y={chartHeight - 6}>
              {String(tick).padStart(2, '0')}:00
            </SvgText>
          ))}
        </Svg>
      </View>
      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-2">
        <LegendItem color="#10b981" label="Glucose" />
        <LegendItem color="#fb7185" label="Heart rate" />
        <LegendItem color="#f59e0b" label="Meal" />
        <LegendItem color="#7c2ae8" diamond label="Medication" />
      </View>
    </View>
  );
}
