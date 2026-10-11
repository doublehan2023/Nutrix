import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { colors } from '../../../constants/theme';
import { PhotoPickerStatusMessage } from '@/components/meals/meal-photo-preview';
import { useMealDraft } from '@/features/meals/meal-draft-context';
import { useMealPhotoPicker } from '@/hooks/use-meal-photo-picker';
import { createGatewayClient, type Readiness } from '@/api/gateway';
import { useAuth } from '@/auth/auth-provider';
import { useLanguage } from '@/features/localization/language-context';

export default function TodayScreen() {
  const router = useRouter();
  const { startDraft } = useMealDraft();
  const { getSessionToken } = useAuth();
  const { t } = useLanguage();
  const gateway = useMemo(() => createGatewayClient({ getToken: getSessionToken }), [getSessionToken]);
  const [readiness, setReadiness] = useState<Readiness>();
  const [readinessError, setReadinessError] = useState<string>();

  const loadReadiness = useCallback(async () => {
    try {
      setReadinessError(undefined);
      setReadiness(await gateway.getReadiness());
    } catch (error) {
      setReadinessError(error instanceof Error ? error.message : 'Unable to load your Nutrix status.');
    }
  }, [gateway]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);
  const { choosePhotoSource, status } = useMealPhotoPicker({
    onPhotoReady: (photo) => {
      startDraft(photo);
      router.push('/meal-edit');
    },
  });

  return (
    <SafeAreaView className="app-screen px-5 pt-5">
      <ScrollView contentContainerClassName="pb-32">
        <Text className="text-sm font-semibold uppercase tracking-widest text-brand-dark">
          Nutrix
        </Text>
        <Text className="mt-3 text-4xl font-bold tracking-tight text-ink">{t('today')}</Text>
        <Text className="app-body-copy mt-3">
          {t('todayDescription')}
        </Text>
        <View className="app-card mt-5">
          <Text className="app-card-title">{t('personalizationStatus')}</Text>
          {readiness ? (
            <Text className="mt-1 text-sm leading-5 text-copy">
              {readiness.status === 'ready'
                ? t('modelReady')
                : t('daysCollected', { days: readiness.daysCollected, required: readiness.requiredDays })}
            </Text>
          ) : (
            <Text className="mt-1 text-sm leading-5 text-copy">{readinessError ?? t('checkingStatus')}</Text>
          )}
        </View>
        <View className="app-card mt-8">
          <Text className="app-card-title">{t('mealPhoto')}</Text>
          <Text className="mt-1 text-sm leading-5 text-copy">
            {t('addPhotoDescription')}
          </Text>

          <Pressable
            accessibilityLabel={t('addMealPhoto')}
            className="app-button-primary mt-4"
            disabled={status === 'processing'}
            onPress={choosePhotoSource}>
            {status === 'processing' ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text className="font-semibold text-on-brand">
                {t('addMealPhoto')}
              </Text>
            )}
          </Pressable>
          {status === 'processing' ? <Text className="mt-3 text-center text-sm text-copy">{t('preparingPhoto')}</Text> : null}
          <PhotoPickerStatusMessage status={status} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
