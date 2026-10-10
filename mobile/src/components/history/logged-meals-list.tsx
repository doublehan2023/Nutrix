import { Text, View } from 'react-native';

import type { HistoryDay } from '@/data/history';

type LoggedMealsListProps = {
  day: HistoryDay;
};

export function LoggedMealsList({ day }: LoggedMealsListProps) {
  return (
    <View className="app-card mt-4">
      <Text className="app-card-title">Logged meals · Day {day.id.slice(1)}</Text>
      <View className="mt-3 gap-4">
        {day.meals.map((meal) => (
          <View className="flex-row items-center" key={`${meal.name}-${meal.time}`}>
            <View className="mr-3 h-3 w-3 rounded-full bg-meal" />
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink">{meal.name}</Text>
              <Text className="mt-0.5 text-xs text-copy">
                {meal.summary} · {meal.time} · {meal.carbs} g carbs
              </Text>
            </View>
            <View className="ml-3 items-end">
              <Text className="text-xl font-medium tracking-tight text-ink">{meal.peak}</Text>
              <Text className="text-xs text-copy">peak mg/dL</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
