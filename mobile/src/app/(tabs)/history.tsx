import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DailyAverageChart } from '@/components/history/daily-average-chart';
import { DaySelector } from '@/components/history/day-selector';
import { HistoryTimelineChart } from '@/components/history/history-timeline-chart';
import { LoggedMealsList } from '@/components/history/logged-meals-list';
import { historyByDay, historyDayOrder, type HistoryDayId } from '@/data/history';

const historyDays = historyDayOrder.map((day) => historyByDay[day]);

export default function HistoryScreen() {
  const [selectedDayId, setSelectedDayId] = useState<HistoryDayId>('D7');
  const selectedDay = historyByDay[selectedDayId];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-32" showsVerticalScrollIndicator={false}>
        <Text className="pt-5 text-3xl font-semibold tracking-tight text-slate-950">History</Text>
        <View className="mt-5">
          <DaySelector days={historyDayOrder} onSelect={setSelectedDayId} selectedDay={selectedDayId} />
        </View>
        <HistoryTimelineChart day={selectedDay} />
        <DailyAverageChart days={historyDays} selectedDay={selectedDayId} />
        <LoggedMealsList day={selectedDay} />
      </ScrollView>
    </SafeAreaView>
  );
}
