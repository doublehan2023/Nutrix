import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeatureImportanceCard } from '@/components/insights/feature-importance-card';
import { ModelConfidenceCard } from '@/components/insights/model-confidence-card';
import { ResponseComparisonChart } from '@/components/insights/response-comparison-chart';
import { TimeInRangeCard } from '@/components/insights/time-in-range-card';
import { featureImportance, getPersonalInsights, populationResponse } from '@/data/insights';
import { historyByDay, historyDayOrder } from '@/data/history';

const insights = getPersonalInsights(historyDayOrder.map((day) => historyByDay[day]));

export default function InsightsScreen() {
  return (
    <SafeAreaView className="app-screen" edges={['top']}>
      <ScrollView contentContainerClassName="app-scroll-content" showsVerticalScrollIndicator={false}>
        <Text className="app-page-title">Insights</Text>
        <View className="mt-5">
          <TimeInRangeCard data={insights.timeInRange} />
        </View>
        <ResponseComparisonChart
          minutes={insights.responseMinutes}
          personal={insights.personalResponse}
          population={populationResponse}
        />
        <FeatureImportanceCard features={featureImportance} />
        <ModelConfidenceCard daysTracked={insights.daysTracked} loggedMeals={insights.loggedMeals} />
        <Text className="mt-5 text-center text-xs leading-5 text-copy">
          These demo insights are not medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
