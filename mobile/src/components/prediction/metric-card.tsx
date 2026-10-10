import { Text, View } from 'react-native';

type MetricCardProps = {
  label: string;
  unit: string;
  value: string;
};

export function MetricCard({ label, value, unit }: MetricCardProps) {
  return (
    <View className="flex-1 rounded-3xl bg-white p-4 shadow-sm">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{value}</Text>
      <Text className="mt-1 text-xs text-slate-500">{unit}</Text>
    </View>
  );
}
