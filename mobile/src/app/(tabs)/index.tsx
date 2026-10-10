import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../constants/theme';

const MAX_IMAGE_EDGE = 2048;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type MealPhoto = {
  byteSize: number;
  height: number;
  uri: string;
  width: number;
};

type PhotoStatus =
  | 'cancelled'
  | 'idle'
  | 'normalization-error'
  | 'oversize'
  | 'permission-denied'
  | 'processing';

function base64ByteSize(base64: string) {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

async function normalizeMealPhoto(asset: ImagePicker.ImagePickerAsset): Promise<MealPhoto> {
  const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  const longestEdge = Math.max(asset.width, asset.height);

  if (longestEdge > MAX_IMAGE_EDGE) {
    context.resize(asset.width >= asset.height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE });
  }

  const renderedImage = await context.renderAsync();
  const output = await renderedImage.saveAsync({
    base64: true,
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  if (!output.base64) {
    throw new Error('The processed image did not include size metadata.');
  }

  const byteSize = base64ByteSize(output.base64);

  if (byteSize > MAX_IMAGE_BYTES) {
    throw new Error('PHOTO_TOO_LARGE');
  }

  return {
    byteSize,
    height: output.height,
    uri: output.uri,
    width: output.width,
  };
}

export default function TodayScreen() {
  const router = useRouter();
  const [photo, setPhoto] = useState<MealPhoto | null>(null);
  const [status, setStatus] = useState<PhotoStatus>('idle');

  async function processPickerResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) {
      setStatus('cancelled');
      return;
    }

    const asset = result.assets[0];
    setStatus('processing');

    try {
      const normalizedPhoto = await normalizeMealPhoto(asset);
      setPhoto(normalizedPhoto);
      setStatus('idle');
    } catch (error) {
      setStatus(error instanceof Error && error.message === 'PHOTO_TOO_LARGE' ? 'oversize' : 'normalization-error');
    }
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setStatus('permission-denied');
      return;
    }

    try {
      await processPickerResult(
        await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 1,
        }),
      );
    } catch {
      setStatus('normalization-error');
    }
  }

  async function openPhotoLibrary() {
    try {
      await processPickerResult(
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
        }),
      );
    } catch {
      setStatus('normalization-error');
    }
  }

  function choosePhotoSource() {
    if (status === 'processing') {
      return;
    }

    Alert.alert('Upload meal photo', 'Choose a photo source.', [
      { text: 'Camera', onPress: () => void openCamera() },
      { text: 'Photo Library', onPress: () => void openPhotoLibrary() },
      { style: 'cancel', text: 'Cancel', onPress: () => setStatus('cancelled') },
    ]);
  }

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

          {photo ? (
            <View className="mt-4">
              <Image
                accessibilityLabel="Selected meal photo"
                source={{ uri: photo.uri }}
                className="h-52 w-full rounded-2xl bg-line"
              />
              <Text className="mt-3 text-xs text-copy">
                JPEG · {photo.width} × {photo.height} · {(photo.byteSize / 1024 / 1024).toFixed(1)} MB
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityLabel={photo ? 'Replace meal photo' : 'Upload meal photo'}
            className="app-button-primary mt-4"
            disabled={status === 'processing'}
            onPress={choosePhotoSource}>
            {status === 'processing' ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text className="font-semibold text-on-brand">
                {photo ? 'Replace meal photo' : 'Upload meal photo'}
              </Text>
            )}
          </Pressable>

          {photo ? (
            <Pressable
              accessibilityLabel="Predict glucose reponse"
              accessibilityRole="button"
              className="app-button-secondary mt-3"
              onPress={() => router.push('/prediction')}>
              <Text className="font-semibold text-on-secondary">Predict glucose reponse</Text>
            </Pressable>
          ) : null}

          {status === 'processing' ? (
            <Text className="mt-3 text-center text-sm text-copy">Preparing your photo…</Text>
          ) : null}
          {status === 'cancelled' ? (
            <Text className="mt-3 text-center text-sm text-copy">Photo selection cancelled.</Text>
          ) : null}
          {status === 'permission-denied' ? (
            <Text className="mt-3 text-center text-sm text-danger">
              Camera access was denied. Enable it in Settings to take a meal photo.
            </Text>
          ) : null}
          {status === 'normalization-error' ? (
            <Text className="mt-3 text-center text-sm text-danger">
              We could not prepare that photo. Try another image.
            </Text>
          ) : null}
          {status === 'oversize' ? (
            <Text className="mt-3 text-center text-sm text-danger">
              That photo is over 8 MB after preparation. Try another image.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
