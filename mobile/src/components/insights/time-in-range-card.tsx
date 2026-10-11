import { Text, View } from 'react-native';

import type { TimeInRange } from '@/data/insights';
import { colors } from '../../../constants/theme';
import { useLanguage } from '@/features/localization/language-context';

type TimeInRangeCardProps = {
  data: TimeInRange;
};

const rangeItems = [
  { color: colors.secondary, key: 'low', label: 'low' },
  { color: colors.success, key: 'inRange', label: 'inRange' },
  { color: colors.destructive, key: 'high', label: 'high' },
] as const;

export function TimeInRangeCard({ data }: TimeInRangeCardProps) {
  const { t } = useLanguage();
  return (
    <View className="app-card">
      <Text className="app-card-title">{t('timeInRange')}</Text>
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
              <Text className="text-sm text-copy">{t(item.label)}</Text>
            </View>
            <Text className="mt-1 text-2xl font-medium text-ink">{data[item.key]}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
