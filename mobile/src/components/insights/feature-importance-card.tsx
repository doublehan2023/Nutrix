import { Text, View } from 'react-native';

type Feature = {
  label: string;
  value: number;
};

type FeatureImportanceCardProps = {
  features: readonly Feature[];
};

export function FeatureImportanceCard({ features }: FeatureImportanceCardProps) {
  return (
    <View className="app-card mt-4">
      <Text className="app-card-title">Feature importance · this person</Text>
      <View className="mt-4 gap-2">
        {features.map((feature, index) => (
          <View className="flex-row items-center" key={feature.label}>
            <Text className="w-44 text-sm text-copy">{feature.label}</Text>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-line">
              <View
                className="h-full rounded-full"
                style={{ backgroundColor: index === 0 ? '#2861f5' : '#7fa0f9', width: `${feature.value}%` }}
              />
            </View>
            <Text className="ml-3 w-9 text-right text-sm font-medium text-ink">{feature.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
