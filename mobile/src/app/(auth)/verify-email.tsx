import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AuthHeader, AuthScreen, ErrorMessage, Field, PrimaryButton, TextButton } from '@/components/auth/auth-ui';
import { useAuth } from '@/auth/auth-provider';

export default function VerifyEmailScreen() {
  const { email: rawEmail } = useLocalSearchParams<{ email?: string }>();
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail ?? '';
  const { confirmPatientSignUp, resendVerificationCode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function verify() {
    setError(undefined);
    if (!email || !code.trim()) {
      setError('Enter the verification code sent to your email.');
      return;
    }
    setIsSubmitting(true);
    try {
      const signedIn = await confirmPatientSignUp(email, code);
      if (!signedIn) {
        setError('Your email is verified. Please sign in to continue.');
        router.replace('/(auth)/sign-in');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not verify that code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    setError(undefined);
    setNotice(undefined);
    try {
      await resendVerificationCode(email);
      setNotice('A new verification code has been sent.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not send a new code.');
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Verify your email" subtitle={email ? `Enter the code sent to ${email}.` : 'Enter the code sent to your email.'} />
      <ErrorMessage message={error ?? notice} />
      <Field label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" placeholder="123456" returnKeyType="done" onSubmitEditing={verify} />
      <PrimaryButton label="Verify and continue" onPress={verify} disabled={isSubmitting} />
      <TextButton label="Send a new code" onPress={resend} />
      <TextButton label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
    </AuthScreen>
  );
}
