import { Pressable, Text, View } from 'react-native';

import type { HistoryDayId } from '@/data/history';

type DaySelectorProps = {
  days: readonly HistoryDayId[];
  onSelect: (day: HistoryDayId) => void;
  selectedDay: HistoryDayId;
};

export function DaySelector({ days, onSelect, selectedDay }: DaySelectorProps) {
  return (
    <View className="flex-row justify-between gap-2">
      {days.map((day) => {
        const selected = day === selectedDay;

        return (
          <Pressable
            key={day}
            accessibilityLabel={`Select ${day}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`h-12 flex-1 items-center justify-center rounded-2xl ${
              selected ? 'bg-brand' : 'bg-surface'
            }`}
            onPress={() => onSelect(day)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.78 : 1,
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: selected ? 0.16 : 0.06,
              shadowRadius: 8,
              elevation: 2,
            })}>
            <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{day}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
