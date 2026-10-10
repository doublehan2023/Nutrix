import { Image, Pressable, Text, View } from 'react-native';

import type { MealPhoto } from '@/features/meals/meal-photo';
import type { PhotoPickerStatus } from '@/hooks/use-meal-photo-picker';

type MealPhotoPreviewProps = {
  onReplace: () => void;
  photo: MealPhoto;
  status: PhotoPickerStatus;
};

export function MealPhotoPreview({ onReplace, photo, status }: MealPhotoPreviewProps) {
  return (
    <View className="app-card mt-4">
      <Text className="app-card-title">Photo</Text>
      <Text className="mt-1 text-sm text-copy">Used for nutrition estimation</Text>
      <Image accessibilityLabel="Selected meal photo" className="mt-4 h-48 w-full rounded-card bg-line" source={{ uri: photo.uri }} />
      <Text className="mt-2 text-xs text-copy">
        JPEG · {photo.width} × {photo.height} · {(photo.byteSize / 1024 / 1024).toFixed(1)} MB
      </Text>
      <Pressable accessibilityRole="button" className="mt-4 self-start rounded-full bg-brand-soft px-4 py-2" onPress={onReplace}>
        <Text className="text-sm font-semibold text-brand-dark">
          {status === 'processing' ? 'Preparing photo…' : 'Replace photo'}
        </Text>
      </Pressable>
      <PhotoPickerStatusMessage status={status} />
    </View>
  );
}

export function PhotoPickerStatusMessage({ status }: { status: PhotoPickerStatus }) {
  if (status === 'idle' || status === 'processing') return null;

  const message = {
    cancelled: 'Photo selection cancelled.',
    'permission-denied': 'Camera access was denied. Enable it in Settings to take a meal photo.',
    'normalization-error': 'We could not prepare that photo. Try another image.',
    oversize: 'That photo is over 8 MB after preparation. Try another image.',
  }[status];

  return <Text className={`mt-3 text-center text-sm ${status === 'cancelled' ? 'text-copy' : 'text-danger'}`}>{message}</Text>;
}
