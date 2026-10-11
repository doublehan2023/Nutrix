import { Pressable, Text } from 'react-native';

type SelectionChipProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

export function SelectionChip({ label, onPress, selected }: SelectionChipProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      className={`min-h-12 justify-center rounded-card border px-4 py-2 ${
        selected ? 'border-secondary-hover bg-status-low' : 'border-transparent bg-canvas'
      }`}
      onPress={onPress}>
      <Text className={`text-base ${selected ? 'font-semibold text-on-secondary' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}
