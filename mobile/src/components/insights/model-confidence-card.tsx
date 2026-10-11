import { Text, View } from 'react-native';
import { useLanguage } from '@/features/localization/language-context';

type ModelConfidenceCardProps = {
  daysTracked: number;
  loggedMeals: number;
  responseWindows: number;
};

export function ModelConfidenceCard({ daysTracked, loggedMeals, responseWindows }: ModelConfidenceCardProps) {
  const { t } = useLanguage();
  return (
    <View className="app-card mt-4">
      <View className="flex-row items-center justify-between">
        <Text className="app-card-title">{t('recordedCoverage')}</Text>
      </View>
      <Text className="mt-4 text-base leading-6 text-copy">
        {t('coverageText', { days: daysTracked, meals: loggedMeals })}
      </Text>
      <Text className="mt-1 text-base leading-6 text-copy">
        {t('responseText', { count: responseWindows })}
      </Text>
    </View>
  );
}
