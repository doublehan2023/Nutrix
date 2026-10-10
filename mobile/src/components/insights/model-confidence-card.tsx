import { Text, View } from 'react-native';

type ModelConfidenceCardProps = {
  daysTracked: number;
  loggedMeals: number;
};

export function ModelConfidenceCard({ daysTracked, loggedMeals }: ModelConfidenceCardProps) {
  return (
    <View className="app-card mt-4">
      <View className="flex-row items-center justify-between">
        <Text className="app-card-title">Model confidence</Text>
        <Text className="text-lg font-medium text-warning">Moderate</Text>
      </View>
      <View className="mt-4 h-3 overflow-hidden rounded-full bg-line">
        <View className="h-full w-[72%] rounded-full bg-warning" />
      </View>
      <Text className="mt-4 text-base leading-6 text-copy">
        {daysTracked} days of CGM, {loggedMeals} logged meals, 0% heart-rate gaps.
      </Text>
      <Text className="mt-1 text-base leading-6 text-copy">Confidence drops for meals unlike those seen so far.</Text>
    </View>
  );
}
