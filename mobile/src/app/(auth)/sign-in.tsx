import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthHeader, AuthScreen, ErrorMessage, RoleTab, TextButton } from '@/components/auth/auth-ui';
import { useAuth } from '@/auth/auth-provider';
import { messageForClerkError } from '@/auth/clerk-error';
import { roles, type Role } from '@/auth/types';

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function SignInScreen() {
  const { beginRoleLogin, cancelRoleLogin, clearSignInError, signInError } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const [role, setRole] = useState<Role>('Patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patientSelected = role === 'Patient';
  const isBusy = isSubmitting || fetchStatus === 'fetching';

  async function submit() {
    setSubmitError(undefined);
    const nextErrors: FieldErrors = {};
    if (!email.trim()) nextErrors.email = 'Enter your email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      beginRoleLogin(role);
      const { error: signInFailure } = await signIn.password({
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      if (signInFailure) {
        cancelRoleLogin();
        setSubmitError(messageForClerkError(signInFailure));
        return;
      }
      if (signIn.status !== 'complete') {
        cancelRoleLogin();
        setSubmitError('Finish the account setup in your invitation or password-reset email, then sign in again.');
        return;
      }

      const { error: finalizeFailure } = await signIn.finalize({ navigate: () => router.replace('/') });
      if (finalizeFailure) {
        cancelRoleLogin();
        setSubmitError(messageForClerkError(finalizeFailure));
      }
    } catch (reason) {
      cancelRoleLogin();
      setSubmitError(reason instanceof Error ? reason.message : 'We could not sign you in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Secure login" subtitle="Choose your portal to continue to Nutrix." />
      <View accessibilityRole="tablist" style={styles.roleTabs}>
        {roles.map((item) => (
          <RoleTab
            key={item}
            label={item}
            active={role === item}
            onPress={() => {
              setRole(item);
              setSubmitError(undefined);
              setFieldErrors({});
              clearSignInError();
            }}
          />
        ))}
      </View>

      {!patientSelected && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>{role} access is invite-only</Text>
          <Text style={styles.noticeText}>
            Use the credentials created by the Nutrix team. If you need access, contact your organization administrator.
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="Enter your email"
            placeholderTextColor="rgba(0, 0, 0, 0.45)"
            style={[styles.input, fieldErrors.email && styles.inputError]}
            textContentType="emailAddress"
            value={email}
          />
          {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            autoComplete="current-password"
            autoCorrect={false}
            onChangeText={(value) => {
              setPassword(value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            onSubmitEditing={submit}
            placeholder="Enter your password"
            placeholderTextColor="rgba(0, 0, 0, 0.45)"
            secureTextEntry
            style={[styles.input, fieldErrors.password && styles.inputError]}
            textContentType="password"
            value={password}
          />
          {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}
        </View>

        <ErrorMessage message={submitError ?? signInError} />
        <Pressable
          accessibilityLabel={`Sign in as ${role}`}
          accessibilityRole="button"
          disabled={isBusy}
          onPress={submit}
          style={({ pressed }) => [styles.signInButton, (pressed || isBusy) && styles.buttonMuted]}>
          {isBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.signInButtonText}>Sign in as {role}</Text>}
        </Pressable>
      </View>

      <TextButton label="Forgot password?" onPress={() => router.push('/(auth)/forgot-password')} />
      {patientSelected && (
        <View style={styles.linkRow}>
          <Text style={styles.linkCopy}>New to Nutrix?</Text>
          <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={styles.link}>Create a patient account</Text>
          </Pressable>
        </View>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  roleTabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#c9d1dc', marginBottom: 24 },
  notice: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 12, marginBottom: 17 },
  noticeTitle: { color: '#1e3a8a', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  noticeText: { color: '#334f7a', fontSize: 14, lineHeight: 19 },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { color: '#26344c', fontSize: 16, fontWeight: '700' },
  input: { height: 54, borderWidth: 1, borderColor: '#bdc8d7', borderRadius: 14, color: '#101827', fontSize: 17, paddingHorizontal: 15, backgroundColor: '#fff' },
  inputError: { borderColor: '#dc2626' },
  fieldError: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  signInButton: { minHeight: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2563eb', marginTop: 2, elevation: 3 },
  signInButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  buttonMuted: { opacity: 0.65 },
  linkRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 5, marginTop: 2, paddingVertical: 10 },
  linkCopy: { color: '#526075', fontSize: 15 },
  link: { color: '#1d4ed8', fontSize: 15, fontWeight: '800' },
});
