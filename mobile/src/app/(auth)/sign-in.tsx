import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSignIn } from "@clerk/expo";

import {
  AuthHeader,
  AuthScreen,
  ErrorMessage,
  Field,
  PrimaryButton,
  RoleTab,
  TextButton,
} from "@/components/auth/auth-ui";
import { useAuth } from "@/auth/auth-provider";
import { messageForClerkError } from "@/auth/clerk-error";
import { roles, type Role } from "@/auth/types";

export default function SignInScreen() {
  const { beginRoleLogin, cancelRoleLogin, clearSignInError, signInError } =
    useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const [role, setRole] = useState<Role>("Patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setError(undefined);
    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
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
        setError(messageForClerkError(signInFailure));
        return;
      }
      if (signIn.status !== "complete") {
        cancelRoleLogin();
        setError(
          "This account needs an additional sign-in step that is not enabled for this portal.",
        );
        return;
      }

      const { error: finalizeFailure } = await signIn.finalize({
        navigate: () => router.replace("/"),
      });
      if (finalizeFailure) {
        cancelRoleLogin();
        setError(messageForClerkError(finalizeFailure));
      }
    } catch (reason) {
      cancelRoleLogin();
      setError(
        reason instanceof Error ? reason.message : "We could not sign you in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const patientSelected = role === "Patient";

  return (
    <AuthScreen>
      <AuthHeader
        title="Secure login"
        subtitle="Choose your portal to continue to Nutrix."
      />
      <View accessibilityRole="tablist" style={styles.roleTabs}>
        {roles.map((item) => (
          <RoleTab
            key={item}
            label={item}
            active={role === item}
            onPress={() => {
              setRole(item);
              setError(undefined);
              clearSignInError();
            }}
          />
        ))}
      </View>
      {!patientSelected && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>{role} access is invite-only</Text>
          <Text style={styles.noticeText}>
            Use the credentials created by the Nutrix team. If you need access,
            contact your organization administrator.
          </Text>
        </View>
      )}
      <ErrorMessage message={error ?? signInError} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="username"
        placeholder="you@example.com"
        returnKeyType="next"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        placeholder="Enter your password"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <PrimaryButton
        label={`Log in as ${role}`}
        onPress={submit}
        disabled={isSubmitting || fetchStatus === "fetching"}
      />
      <TextButton
        label="Forgot password?"
        onPress={() => router.push("/(auth)/forgot-password")}
      />
      {patientSelected && (
        <TextButton
          label="New to Nutrix? Create a patient account"
          onPress={() => router.push("/(auth)/sign-up")}
        />
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  roleTabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#c9d1dc",
    marginBottom: 24,
  },
  notice: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 12,
    marginBottom: 17,
  },
  noticeTitle: {
    color: "#1e3a8a",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  noticeText: { color: "#334f7a", fontSize: 14, lineHeight: 19 },
});
