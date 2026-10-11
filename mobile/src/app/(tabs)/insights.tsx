import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModelConfidenceCard } from '@/components/insights/model-confidence-card';
import { ResponseComparisonChart } from '@/components/insights/response-comparison-chart';
import { TimeInRangeCard } from '@/components/insights/time-in-range-card';
import { useAuth } from '@/auth/auth-provider';
import { getDemoHistory } from '@/data/demo-history';
import { useLanguage } from '@/features/localization/language-context';

export default function InsightsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const history = getDemoHistory(user?.personId);

  return (
    <SafeAreaView className="app-screen" edges={['top']}>
      <ScrollView contentContainerClassName="app-scroll-content" showsVerticalScrollIndicator={false}>
        <Text className="app-page-title">{t('insights')}</Text>
        <Text className="mt-2 text-sm text-copy">
          {history.participantLabel} · observed CGMacros baseline data
        </Text>
        <View className="mt-5">
          <TimeInRangeCard data={history.timeInRange} />
        </View>
        <ResponseComparisonChart
          minutes={[0, 30, 60, 90, 120]}
          response={history.response}
          sampleSize={history.responseSampleSize}
        />
        <ModelConfidenceCard daysTracked={7} loggedMeals={history.trackedMeals} responseWindows={history.responseSampleSize} />
        <Text className="mt-5 text-center text-xs leading-5 text-copy">
          These figures are hardcoded from recorded CGMacros data for this demo and are not medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
