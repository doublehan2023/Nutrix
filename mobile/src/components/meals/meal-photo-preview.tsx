import { Image, Pressable, Text, View } from 'react-native';

import type { MealPhoto } from '@/features/meals/meal-photo';
import type { PhotoPickerStatus } from '@/hooks/use-meal-photo-picker';
import { useLanguage } from '@/features/localization/language-context';

type MealPhotoPreviewProps = {
  onReplace: () => void;
  photo: MealPhoto;
  status: PhotoPickerStatus;
};

export function MealPhotoPreview({ onReplace, photo, status }: MealPhotoPreviewProps) {
  const { t } = useLanguage();
  return (
    <View className="app-card mt-4">
      <Text className="app-card-title">{t('photo')}</Text>
      <Text className="mt-1 text-sm text-copy">{t('nutritionEstimation')}</Text>
      <Image accessibilityLabel="Selected meal photo" className="mt-4 h-48 w-full rounded-card bg-line" source={{ uri: photo.uri }} />
      <Text className="mt-2 text-xs text-copy">
        JPEG · {photo.width} × {photo.height} · {(photo.byteSize / 1024 / 1024).toFixed(1)} MB
      </Text>
      <Pressable accessibilityRole="button" className="mt-4 self-start rounded-full bg-brand-soft px-4 py-2" onPress={onReplace}>
        <Text className="text-sm font-semibold text-brand-dark">
          {status === 'processing' ? t('preparingPhoto') : t('replacePhoto')}
        </Text>
      </Pressable>
      <PhotoPickerStatusMessage status={status} />
    </View>
  );
}

export function PhotoPickerStatusMessage({ status }: { status: PhotoPickerStatus }) {
  const { t } = useLanguage();
  if (status === 'idle' || status === 'processing') return null;

  const message = {
    cancelled: t('photoCancelled'),
    'permission-denied': t('photoPermissionDenied'),
    'normalization-error': t('photoNormalizationError'),
    oversize: t('photoOversize'),
  }[status];

  return <Text className={`mt-3 text-center text-sm ${status === 'cancelled' ? 'text-copy' : 'text-danger'}`}>{message}</Text>;
}
