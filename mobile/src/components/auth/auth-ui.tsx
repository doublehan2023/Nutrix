import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../constants/theme';

export function AuthScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.mark} accessibilityElementsHidden>
        <Text style={styles.markText}>N</Text>
      </View>
      <Text style={styles.brand}>NUTRIX</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#758094"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, (disabled || pressed) && styles.buttonMuted]}>
      {disabled ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textButton}>
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function ErrorMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <View accessibilityLiveRegion="polite" style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eaf3ff' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 30,
    shadowColor: '#183252',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  header: { alignItems: 'center', marginBottom: 28 },
  mark: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', marginBottom: 13 },
  markText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  brand: { color: '#2563eb', fontWeight: '800', fontSize: 12, letterSpacing: 2.4, marginBottom: 8 },
  title: { color: colors.foreground, fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#526075', fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 8 },
  roleTabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#c9d1dc', marginBottom: 26 },
  roleTab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  roleTabActive: { borderBottomColor: '#2563eb' },
  roleTabText: { color: '#6d7789', fontSize: 16, fontWeight: '700' },
  roleTabTextActive: { color: '#2563eb' },
  fieldGroup: { marginBottom: 17 },
  label: { color: '#26344c', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  input: { height: 52, borderWidth: 1, borderColor: '#bdc8d7', borderRadius: 14, color: '#101827', fontSize: 17, paddingHorizontal: 15, backgroundColor: '#fff' },
  primaryButton: { minHeight: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2563eb', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  buttonMuted: { opacity: 0.68 },
  textButton: { alignSelf: 'center', paddingVertical: 13, paddingHorizontal: 8 },
  textButtonLabel: { color: '#1d4ed8', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  error: { borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, marginBottom: 17 },
  errorText: { color: '#b91c1c', fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#d8dee8', marginVertical: 4 },
});

export function RoleTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.roleTab, active && styles.roleTabActive]}>
      <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>{label}</Text>
    </Pressable>
  );
}
