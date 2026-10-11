import { Text, View } from 'react-native';

type ModelConfidenceCardProps = {
  daysTracked: number;
  loggedMeals: number;
  responseWindows: number;
};

export function ModelConfidenceCard({ daysTracked, loggedMeals, responseWindows }: ModelConfidenceCardProps) {
  return (
    <View className="app-card mt-4">
      <View className="flex-row items-center justify-between">
        <Text className="app-card-title">Recorded data coverage</Text>
      </View>
      <Text className="mt-4 text-base leading-6 text-copy">
        {daysTracked} days of CGM and {loggedMeals} recorded meals in the displayed baseline.
      </Text>
      <Text className="mt-1 text-base leading-6 text-copy">
        {responseWindows} meals had complete 0–120 minute glucose windows for the response calculation.
      </Text>
    </View>
  );
}
