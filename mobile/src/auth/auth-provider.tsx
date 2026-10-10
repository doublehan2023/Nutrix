import type * as AmplifyAuth from 'aws-amplify/auth';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isAmplifyConfigured } from '@/lib/amplify';

import { type AuthenticatedUser, type Role, roleFromGroups } from './types';

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  autoSignIn,
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  fetchUserAttributes,
  resetPassword,
  resendSignUpCode,
  signIn,
  signOut: amplifySignOut,
  signUp,
} = require('aws-amplify/dist/cjs/auth/index.js') as typeof AmplifyAuth;
/* eslint-enable @typescript-eslint/no-require-imports */

type SignInOutcome =
  | { status: 'signed-in' }
  | { status: 'confirm-sign-up' }
  | { status: 'role-mismatch' }
  | { status: 'additional-step'; message: string };

type AuthContextValue = {
  isReady: boolean;
  isConfigured: boolean;
  user: AuthenticatedUser | null;
  signInWithRole: (email: string, password: string, role: Role) => Promise<SignInOutcome>;
  signUpPatient: (name: string, email: string, password: string) => Promise<void>;
  confirmPatientSignUp: (email: string, code: string) => Promise<boolean>;
  resendVerificationCode: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  setNewPassword: (email: string, code: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function messageForError(error: unknown) {
  const name = typeof error === 'object' && error && 'name' in error ? String(error.name) : '';

  const messages: Record<string, string> = {
    UserNotFoundException: 'We could not find an account with that email.',
    NotAuthorizedException: 'Your email or password is incorrect.',
    UserNotConfirmedException: 'Please verify your email before signing in.',
    UsernameExistsException: 'An account already exists with this email.',
    CodeMismatchException: 'That code is invalid. Please try again.',
    ExpiredCodeException: 'That code has expired. Request a new one and try again.',
    InvalidPasswordException: 'Your password does not meet the required security rules.',
    LimitExceededException: 'Too many attempts. Please wait a moment and try again.',
    NetworkError: 'We could not reach the secure login service. Check your connection.',
  };

  return messages[name] ?? 'We could not complete that request. Please try again.';
}

function authError(error: unknown) {
  return new Error(messageForError(error));
}

function getGroups(session: Awaited<ReturnType<typeof fetchAuthSession>>) {
  const claim = session.tokens?.accessToken?.payload['cognito:groups'];
  if (Array.isArray(claim)) {
    return claim.filter((value): value is string => typeof value === 'string');
  }
  return typeof claim === 'string' ? [claim] : [];
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  const loadSession = useCallback(async () => {
    if (!isAmplifyConfigured) {
      setUser(null);
      return null;
    }

    try {
      const [session, attributes] = await Promise.all([fetchAuthSession(), fetchUserAttributes()]);
      const role = roleFromGroups(getGroups(session));

      if (!role) {
        await amplifySignOut();
        setUser(null);
        return null;
      }

      const authenticatedUser = {
        email: attributes.email ?? '',
        name: attributes.name ?? attributes.email ?? 'Nutrix member',
        role,
      };
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void loadSession().finally(() => setIsReady(true));
  }, [loadSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isConfigured: isAmplifyConfigured,
      user,
      async signInWithRole(email, password, selectedRole) {
        try {
          const result = await signIn({ username: email.trim().toLowerCase(), password });

          if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
            return { status: 'confirm-sign-up' };
          }

          if (result.nextStep.signInStep !== 'DONE') {
            return {
              status: 'additional-step',
              message: 'This account needs an additional sign-in step that is not enabled for this portal.',
            };
          }

          const authenticatedUser = await loadSession();
          if (!authenticatedUser || authenticatedUser.role !== selectedRole) {
            await amplifySignOut();
            setUser(null);
            return { status: 'role-mismatch' };
          }

          return { status: 'signed-in' };
        } catch (error) {
          throw authError(error);
        }
      },
      async signUpPatient(name, email, password) {
        try {
          await signUp({
            username: email.trim().toLowerCase(),
            password,
            options: {
              userAttributes: {
                email: email.trim().toLowerCase(),
                name: name.trim(),
              },
              autoSignIn: true,
            },
          });
        } catch (error) {
          throw authError(error);
        }
      },
      async confirmPatientSignUp(email, code) {
        try {
          await confirmSignUp({
            username: email.trim().toLowerCase(),
            confirmationCode: code.trim(),
          });
          await autoSignIn();
          return Boolean(await loadSession());
        } catch (error) {
          throw authError(error);
        }
      },
      async resendVerificationCode(email) {
        try {
          await resendSignUpCode({ username: email.trim().toLowerCase() });
        } catch (error) {
          throw authError(error);
        }
      },
      async requestPasswordReset(email) {
        try {
          await resetPassword({ username: email.trim().toLowerCase() });
        } catch (error) {
          throw authError(error);
        }
      },
      async setNewPassword(email, code, password) {
        try {
          await confirmResetPassword({
            username: email.trim().toLowerCase(),
            confirmationCode: code.trim(),
            newPassword: password,
          });
        } catch (error) {
          throw authError(error);
        }
      },
      async signOut() {
        await amplifySignOut();
        setUser(null);
      },
    }),
    [isReady, loadSession, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
