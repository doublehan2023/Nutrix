import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthHeader, AuthScreen, ErrorMessage, Field, PrimaryButton, RoleTab, TextButton } from '@/components/auth/auth-ui';
import { useAuth } from '@/auth/auth-provider';
import { roles, type Role } from '@/auth/types';

export default function SignInScreen() {
  const { isConfigured, signInWithRole } = useAuth();
  const [role, setRole] = useState<Role>('Patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setError(undefined);
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    if (!isConfigured) {
      setError('Secure login has not been configured yet. Start the Amplify sandbox, then restart the app.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signInWithRole(email, password, role);
      if (result.status === 'confirm-sign-up') {
        router.push({ pathname: '/(auth)/verify-email', params: { email } });
      } else if (result.status === 'role-mismatch') {
        setError(`This account is not authorized for the ${role} portal. Choose the role assigned by your care team.`);
      } else if (result.status === 'additional-step') {
        setError(result.message);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not sign you in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const patientSelected = role === 'Patient';

  return (
    <AuthScreen>
      <AuthHeader title="Secure login" subtitle="Choose your portal to continue to Nutrix." />
      <View accessibilityRole="tablist" style={styles.roleTabs}>
        {roles.map((item) => <RoleTab key={item} label={item} active={role === item} onPress={() => { setRole(item); setError(undefined); }} />)}
      </View>
      {!patientSelected && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>{role} access is invite-only</Text>
          <Text style={styles.noticeText}>Use the credentials created by the Nutrix team. If you need access, contact your organization administrator.</Text>
        </View>
      )}
      <ErrorMessage message={error} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="username" placeholder="you@example.com" returnKeyType="next" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" placeholder="Enter your password" returnKeyType="done" onSubmitEditing={submit} />
      <PrimaryButton label={`Log in as ${role}`} onPress={submit} disabled={isSubmitting} />
      <TextButton label="Forgot password?" onPress={() => router.push('/(auth)/forgot-password')} />
      {patientSelected && <TextButton label="New to Nutrix? Create a patient account" onPress={() => router.push('/(auth)/sign-up')} />}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  roleTabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#c9d1dc', marginBottom: 24 },
  notice: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 12, marginBottom: 17 },
  noticeTitle: { color: '#1e3a8a', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  noticeText: { color: '#334f7a', fontSize: 14, lineHeight: 19 },
});
