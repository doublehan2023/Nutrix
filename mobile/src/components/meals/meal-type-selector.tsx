import { Pressable, Text, View } from 'react-native';

import { mealTypes, type MealType } from '@/features/meals/meal-draft-context';

type MealTypeSelectorProps = {
  onChange: (mealType: MealType) => void;
  value: MealType;
};

export function MealTypeSelector({ onChange, value }: MealTypeSelectorProps) {
  return (
    <View className="app-card">
      <Text className="app-card-title">Meal type</Text>
      <View className="mt-3 flex-row gap-2">
        {mealTypes.map((mealType) => {
          const selected = mealType === value;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`min-h-20 flex-1 items-center justify-center rounded-card border px-1 ${
                selected ? 'border-brand-dark bg-brand-soft' : 'border-transparent bg-canvas'
              }`}
              key={mealType}
              onPress={() => onChange(mealType)}>
              <Text className={`text-center text-sm font-semibold ${selected ? 'text-brand-dark' : 'text-ink'}`}>
                {mealType}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
