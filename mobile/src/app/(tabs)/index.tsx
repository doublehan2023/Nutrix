import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../constants/theme';
import { PhotoPickerStatusMessage } from '@/components/meals/meal-photo-preview';
import { useMealDraft } from '@/features/meals/meal-draft-context';
import { useMealPhotoPicker } from '@/hooks/use-meal-photo-picker';

export default function TodayScreen() {
  const router = useRouter();
  const { startDraft } = useMealDraft();
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
