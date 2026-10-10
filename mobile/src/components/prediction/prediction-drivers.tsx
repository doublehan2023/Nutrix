import { Text, View } from 'react-native';

export type PredictionDriver = {
  label: string;
  value: number;
};

type PredictionDriversProps = {
  drivers: readonly PredictionDriver[];
};

export function PredictionDrivers({ drivers }: PredictionDriversProps) {
  return (
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
  );
}
