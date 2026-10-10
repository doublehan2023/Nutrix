import { Pressable, Text, View } from 'react-native';

type PredictionHeaderProps = {
  onBack: () => void;
  title: string;
};

export function PredictionHeader({ onBack, title }: PredictionHeaderProps) {
  return (
    <View className="flex-row items-center py-5">
      <Pressable
        accessibilityLabel="Back to Today"
        accessibilityRole="button"
        className="mr-3 h-10 w-10 items-center justify-center rounded-full active:bg-line"
        onPress={onBack}>
        <Text className="-mt-1 text-4xl font-light leading-none text-ink">‹</Text>
      </Pressable>
      <Text className="text-3xl font-semibold tracking-tight text-ink">{title}</Text>
    </View>
  );
}
