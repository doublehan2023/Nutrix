import { Text, View } from 'react-native';

import { colors } from '../../../constants/theme';

export type PredictionDriver = {
  label: string;
  value: number;
};

type PredictionDriversProps = {
  drivers: readonly PredictionDriver[];
};

export function PredictionDrivers({ drivers }: PredictionDriversProps) {
  return (
    <View className="app-card mt-4">
      <Text className="app-card-title">Top drivers for this prediction</Text>
      <View className="mt-4 gap-2">
        {drivers.map((driver, index) => (
          <View className="flex-row items-center" key={driver.label}>
            <Text className="w-44 text-sm text-copy">{driver.label}</Text>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-line">
              <View
                className="h-full rounded-full"
                style={{ backgroundColor: index === 0 ? colors.medication : colors.accent, width: `${driver.value}%` }}
              />
            </View>
            <Text className="ml-3 w-9 text-right text-sm font-medium text-ink">{driver.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
