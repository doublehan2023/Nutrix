import { Text, View } from 'react-native';

import type { TimeInRange } from '@/data/insights';
import { colors } from '../../../constants/theme';

type TimeInRangeCardProps = {
  data: TimeInRange;
};

const rangeItems = [
  { color: colors.secondary, key: 'low', label: 'Low <70' },
  { color: colors.success, key: 'inRange', label: 'In range' },
  { color: colors.destructive, key: 'high', label: 'High >140' },
] as const;

export function TimeInRangeCard({ data }: TimeInRangeCardProps) {
  return (
    <View className="app-card">
      <Text className="app-card-title">Time in range · last 7 days</Text>
      <View className="mt-3 h-5 flex-row overflow-hidden rounded-full bg-line">
        {rangeItems.map((item) => (
          <View key={item.key} style={{ backgroundColor: item.color, flex: data[item.key] }} />
        ))}
      </View>
      <View className="mt-4 flex-row justify-between">
        {rangeItems.map((item) => (
          <View className="flex-1" key={item.key}>
            <View className="flex-row items-center">
              <View className="mr-1.5 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <Text className="text-sm text-copy">{item.label}</Text>
            </View>
            <Text className="mt-1 text-2xl font-medium text-ink">{data[item.key]}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
