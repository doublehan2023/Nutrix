import { Text, View } from 'react-native';

import type { HistoryDay, HistoryDayId } from '@/data/history';

type DailyAverageChartProps = {
  days: readonly HistoryDay[];
  selectedDay: HistoryDayId;
};

export function DailyAverageChart({ days, selectedDay }: DailyAverageChartProps) {
  const minimum = 90;
  const maximum = 130;

  return (
    <View className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
      <Text className="text-lg font-semibold text-slate-900">Daily average glucose (mg/dL)</Text>
      <View className="mt-4 flex-row items-end border-b border-slate-200 px-2 pt-2">
        {days.map((day) => {
          const selected = day.id === selectedDay;
          const height = 28 + ((day.averageGlucose - minimum) / (maximum - minimum)) * 50;

          return (
            <View className="flex-1 items-center" key={day.id}>
              <Text className="mb-1 text-xs font-medium text-slate-800">{day.averageGlucose}</Text>
              <View
                className={`w-9 rounded-t-lg ${selected ? 'bg-[#2861f5]' : 'bg-[#b9cbff]'}`}
                style={{ height }}
              />
            </View>
          );
        })}
      </View>
      <View className="mt-2 flex-row px-2">
        {days.map((day) => (
          <View className="flex-1 items-center" key={`label-${day.id}`}>
            <Text className={`text-xs ${day.id === selectedDay ? 'font-semibold text-[#2861f5]' : 'text-slate-500'}`}>
              {day.id}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
