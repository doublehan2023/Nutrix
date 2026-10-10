import { Text, View } from 'react-native';

type MetricCardProps = {
  label: string;
  unit: string;
  value: string;
};

export function MetricCard({ label, value, unit }: MetricCardProps) {
  return (
    <View className="flex-1 rounded-card bg-surface p-4 shadow-card">
      <Text className="text-sm text-copy">{label}</Text>
      <Text className="mt-1 text-3xl font-semibold tracking-tight text-ink">{value}</Text>
      <Text className="mt-1 text-xs text-copy">{unit}</Text>
    </View>
  );
}
