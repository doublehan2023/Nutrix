import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AuthHeader, AuthScreen, ErrorMessage, Field, PrimaryButton, TextButton } from '@/components/auth/auth-ui';
import { useAuth } from '@/auth/auth-provider';

export default function ResetPasswordScreen() {
  const { email: rawEmail } = useLocalSearchParams<{ email?: string }>();
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail ?? '';
  const { setNewPassword, requestPasswordReset } = useAuth();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setError(undefined);
    if (!code.trim() || !password || !confirmPassword) {
      setError('Enter your code and new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await setNewPassword(email, code, password);
      router.replace('/(auth)/sign-in');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not reset your password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    setError(undefined);
    setNotice(undefined);
    try {
      await requestPasswordReset(email);
      setNotice('A new reset code has been sent.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not send another code.');
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Choose a new password" subtitle={email ? `Use the code sent to ${email}.` : 'Use the code sent to your email.'} />
      <ErrorMessage message={error ?? notice} />
      <Field label="Reset code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" placeholder="123456" returnKeyType="next" />
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Create a secure password" returnKeyType="next" />
      <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Re-enter your password" returnKeyType="done" onSubmitEditing={submit} />
      <PrimaryButton label="Reset password" onPress={submit} disabled={isSubmitting} />
      <TextButton label="Send a new reset code" onPress={resend} />
    </AuthScreen>
  );
}
