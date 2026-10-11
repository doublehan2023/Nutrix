import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import { MealPhotoPreview } from '@/components/meals/meal-photo-preview';
import { MealTimeField } from '@/components/meals/meal-time-field';
import { MealTypeSelector } from '@/components/meals/meal-type-selector';
import { useMealDraft } from '@/features/meals/meal-draft-context';
import { useMealPhotoPicker } from '@/hooks/use-meal-photo-picker';
import { createGatewayClient, uploadMealPhoto } from '@/api/gateway';
import { useAuth } from '@/auth/auth-provider';
import { useLanguage } from '@/features/localization/language-context';

export default function MealEditScreen() {
  const router = useRouter();
  const { discardDraft, draft, setPrediction, updateDraft, updatePhoto } = useMealDraft();
  const { getSessionToken } = useAuth();
  const { t } = useLanguage();
  const gateway = useMemo(() => createGatewayClient({ getToken: getSessionToken }), [getSessionToken]);
  const [nameError, setNameError] = useState<string>();
  const [predictionError, setPredictionError] = useState<string>();
  const [isPredicting, setIsPredicting] = useState(false);
  const [carbohydratesInput, setCarbohydratesInput] = useState(String(draft?.carbohydrates ?? 0));
  const { choosePhotoSource, status } = useMealPhotoPicker({ onPhotoReady: updatePhoto });

  useEffect(() => {
    if (!draft) {
      router.replace('/');
    }
  }, [draft, router]);

  if (!draft) {
    return null;
  }

  function handleBack() {
    discardDraft();
    router.replace('/');
  }

  function handleCarbohydrates(value: string) {
    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    setCarbohydratesInput(value);
    const carbohydrates = Number(value);
    updateDraft({ carbohydrates: Number.isFinite(carbohydrates) ? carbohydrates : 0 });
  }

  async function openPrediction() {
    if (!draft?.mealName.trim()) {
      setNameError(t('enterMealName'));
      return;
    }
    setPredictionError(undefined);
    setIsPredicting(true);
    try {
      const upload = await gateway.createPhotoUpload();
      await uploadMealPhoto(draft.photo.uri, upload);
      const prediction = await gateway.requestPrediction({
        logMeal: true,
        mealTime: draft.mealTime.toISOString(),
        mealType: draft.mealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        photoKey: upload.photoKey,
      });
      setPrediction(prediction);
      router.push('/prediction');
    } catch (error) {
      setPredictionError(error instanceof Error ? error.message : t('predictionUnavailable'));
    } finally {
      setIsPredicting(false);
    }
  }

  return (
    <SafeAreaView className="app-screen" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-12" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center py-5">
            <Pressable
              accessibilityLabel={t('discardMealDraft')}
              accessibilityRole="button"
              className="mr-3 h-10 w-10 items-center justify-center rounded-full active:bg-line"
              onPress={handleBack}>
              <Text className="-mt-1 text-4xl font-light leading-none text-ink">‹</Text>
            </Pressable>
            <Text className="text-3xl font-bold tracking-tight text-ink">{t('addMeal')}</Text>
          </View>

          <MealTypeSelector onChange={(mealType) => updateDraft({ mealType })} value={draft.mealType} />

          <View className="app-card mt-4">
            <Text className="app-card-title">{t('mealName')}</Text>
            <TextInput
              accessibilityLabel={t('mealName')}
              className={`mt-3 rounded-card border bg-canvas px-4 py-4 text-lg text-ink ${
                nameError ? 'border-danger' : 'border-brand-dark'
              }`}
              onChangeText={(mealName) => {
                updateDraft({ mealName });
                setNameError(undefined);
              }}
              placeholder={t('mealNamePlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
              value={draft.mealName}
            />
            {nameError ? <Text className="mt-2 text-sm text-danger">{nameError}</Text> : null}
          </View>

          <View className="mt-4 flex-row gap-4">
            <View className="app-card flex-1">
              <Text className="app-card-title">{t('carbohydrates')}</Text>
              <View className="mt-3 flex-row items-center rounded-card bg-canvas px-4">
                <TextInput
                  accessibilityLabel={t('carbohydrates')}
                  className="flex-1 py-4 text-lg text-ink"
                  keyboardType="decimal-pad"
                  onChangeText={handleCarbohydrates}
                  value={carbohydratesInput}
                />
                <Text className="text-base text-copy">g</Text>
              </View>
              <Text className="mt-2 text-xs text-copy">{t('optionalPrediction')}</Text>
            </View>
            <MealTimeField onChange={(mealTime) => updateDraft({ mealTime })} value={draft.mealTime} />
          </View>

          <MealPhotoPreview onReplace={choosePhotoSource} photo={draft.photo} status={status} />

          <Pressable accessibilityRole="button" className="app-button-primary mt-5" disabled={isPredicting} onPress={openPrediction}>
            {isPredicting ? <ActivityIndicator color={colors.onPrimary} /> : <Text className="text-lg font-bold text-on-brand">{t('predictResponse')}</Text>}
          </Pressable>
          {predictionError ? <Text className="mt-3 text-center text-sm text-danger">{predictionError}</Text> : null}
          <Text className="mt-4 text-center text-sm leading-5 text-copy">
            {t('predictionPersonalization')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
