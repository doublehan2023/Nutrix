import { Pressable, Text, View } from 'react-native';

type MealTimeFieldProps = {
  onChange: (time: Date) => void;
  value: Date;
};

function formatTime(time: Date) {
  return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MealTimeField({ onChange, value }: MealTimeFieldProps) {
  return (
    <View className="app-card flex-1">
      <Text className="app-card-title">Meal time</Text>
      <Pressable
        accessibilityLabel="Meal time"
        accessibilityRole="button"
        className="mt-3 rounded-card bg-canvas px-4 py-4"
        onPress={() => onChange(new Date())}>
        <Text className="text-lg font-semibold text-ink">{formatTime(value)}</Text>
        <Text className="mt-1 text-xs text-copy">Uses the current time on web preview.</Text>
      </Pressable>
    </View>
  );
}
