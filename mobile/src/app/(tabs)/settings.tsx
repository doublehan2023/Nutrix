import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from '@/auth/auth-provider';
import { LanguageSelector } from '@/components/settings/language-selector';
import { useLanguage } from '@/features/localization/language-context';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  function requestSignOut() {
    Alert.alert(t('signOutTitle'), t('signOutBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView className="app-screen px-5 pt-5">
      <Text className="text-sm font-semibold uppercase tracking-widest text-brand-dark">
        Nutrix
      </Text>
      <Text className="mt-3 text-4xl font-bold tracking-tight text-ink">
        {t('settings')}
      </Text>
      <Text className="app-body-copy mt-3">
        Manage your preferences and health-data connections.
      </Text>
      <View className="app-card mt-8">
        <Text className="text-base font-semibold text-ink">
          {user?.name ?? t('accountFallback')}
        </Text>
        <Text className="mt-1 text-sm text-copy">{user?.email}</Text>
        <View className="mt-3 self-start rounded-full bg-brand-soft px-3 py-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-brand-dark">{user?.role}</Text>
        </View>
      </View>
      <View className="app-card mt-4">
        <Text className="text-base font-semibold text-ink">
          {t('preferences')}
        </Text>
        <Text className="mt-2 text-sm leading-5 text-copy">
          {t('preferencesDescription')}
        </Text>
      </View>
      <Pressable accessibilityRole="button" className="app-card mt-4 flex-row items-center justify-between" onPress={() => router.push('/profile')}>
        <View>
          <Text className="text-base font-semibold text-ink">{t('healthProfile')}</Text>
          <Text className="mt-1 text-sm text-copy">{t('healthProfileDescription')}</Text>
        </View>
        <Text className="text-2xl text-brand-dark">›</Text>
      </Pressable>
      <LanguageSelector
        description={t('languageDescription')}
        isOpen={isLanguageMenuOpen}
        onClose={() => setIsLanguageMenuOpen(false)}
        onOpen={() => setIsLanguageMenuOpen(true)}
        onSelect={(nextLanguage) => {
          setLanguage(nextLanguage);
          setIsLanguageMenuOpen(false);
        }}
        selectedLanguage={language}
        title={t('language')}
      />
      <Pressable
        accessibilityRole="button"
        onPress={requestSignOut}
        className="mt-6 items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
        <Text className="text-base font-bold text-danger">{t('signOut')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
