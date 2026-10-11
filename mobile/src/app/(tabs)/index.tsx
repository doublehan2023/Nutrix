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

export default function TodayScreen() {
  const router = useRouter();
  const { startDraft } = useMealDraft();
  const { getSessionToken } = useAuth();
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
        <Text className="mt-3 text-4xl font-bold tracking-tight text-ink">Today</Text>
        <Text className="app-body-copy mt-3">
          Your meal and glucose forecast will appear here.
        </Text>
        <View className="app-card mt-5">
          <Text className="app-card-title">Personalization status</Text>
          {readiness ? (
            <Text className="mt-1 text-sm leading-5 text-copy">
              {readiness.status === 'ready'
                ? 'Your model is ready for meal predictions.'
                : `${readiness.daysCollected} of ${readiness.requiredDays} days collected. Predictions unlock after your baseline is ready.`}
            </Text>
          ) : (
            <Text className="mt-1 text-sm leading-5 text-copy">{readinessError ?? 'Checking your personalization status…'}</Text>
          )}
        </View>
        <View className="app-card mt-8">
          <Text className="app-card-title">Meal photo</Text>
          <Text className="mt-1 text-sm leading-5 text-copy">
            Add a photo to help capture your meal details.
          </Text>

          <Pressable
            accessibilityLabel="Add meal photo"
            className="app-button-primary mt-4"
            disabled={status === 'processing'}
            onPress={choosePhotoSource}>
            {status === 'processing' ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text className="font-semibold text-on-brand">
                Add meal photo
              </Text>
            )}
          </Pressable>
          {status === 'processing' ? <Text className="mt-3 text-center text-sm text-copy">Preparing your photo…</Text> : null}
          <PhotoPickerStatusMessage status={status} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
