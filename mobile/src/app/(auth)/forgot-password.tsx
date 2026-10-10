import { router } from 'expo-router';
import { useState } from 'react';

import { AuthHeader, AuthScreen, ErrorMessage, Field, PrimaryButton, TextButton } from '@/components/auth/auth-ui';
import { useAuth } from '@/auth/auth-provider';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setError(undefined);
    if (!email.trim()) {
      setError('Enter the email address for your account.');
      return;
    }
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      router.push({ pathname: '/(auth)/reset-password', params: { email } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not start password recovery.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Reset your password" subtitle="We will email you a code to create a new password." />
      <ErrorMessage message={error} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" returnKeyType="done" onSubmitEditing={submit} />
      <PrimaryButton label="Email reset code" onPress={submit} disabled={isSubmitting} />
      <TextButton label="Back to sign in" onPress={() => router.back()} />
    </AuthScreen>
  );
}
