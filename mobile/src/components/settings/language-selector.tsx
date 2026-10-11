import { Modal, Pressable, Text, View } from 'react-native';

import { languages, type LanguageCode } from '@/features/localization/language-context';

type LanguageSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onSelect: (language: LanguageCode) => void;
  selectedLanguage: LanguageCode;
  title: string;
  description: string;
};

export function LanguageSelector({ description, isOpen, onClose, onOpen, onSelect, selectedLanguage, title }: LanguageSelectorProps) {
  const selectedLabel = languages.find((language) => language.code === selectedLanguage)?.label;

  return (
    <>
      <Pressable accessibilityRole="button" className="app-card mt-4 flex-row items-center justify-between" onPress={onOpen}>
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-ink">{title}</Text>
          <Text className="mt-1 text-sm text-copy">{description}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="mr-2 text-sm font-semibold text-brand-dark">{selectedLabel}</Text>
          <Text className="text-2xl text-brand-dark">›</Text>
        </View>
      </Pressable>

      <Modal animationType="fade" onRequestClose={onClose} transparent visible={isOpen}>
        <Pressable accessibilityRole="button" className="flex-1 justify-end bg-black/30 p-5" onPress={onClose}>
          <Pressable accessibilityViewIsModal accessibilityRole="menu" className="rounded-card bg-surface p-2 shadow-card" onPress={(event) => event.stopPropagation()}>
            <Text className="px-3 pb-2 pt-3 text-lg font-bold text-ink">{title}</Text>
            {languages.map((language) => {
              const selected = language.code === selectedLanguage;

              return (
                <Pressable
                  key={language.code}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  className={`flex-row items-center justify-between rounded-card px-3 py-4 ${selected ? 'bg-brand-soft' : ''}`}
                  onPress={() => {
                    onSelect(language.code);
                    onClose();
                  }}>
                  <Text className={`text-base ${selected ? 'font-bold text-brand-dark' : 'text-ink'}`}>{language.label}</Text>
                  {selected ? <Text className="text-lg font-bold text-brand-dark">✓</Text> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
