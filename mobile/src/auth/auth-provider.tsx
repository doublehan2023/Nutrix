import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/expo';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { type AuthenticatedUser, type Role, roleFromMetadata } from './types';

type AuthContextValue = {
  isReady: boolean;
  user: AuthenticatedUser | null;
  signInError?: string;
  beginRoleLogin: (role: Role) => void;
  cancelRoleLogin: () => void;
  clearSignInError: () => void;
  getSessionToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [selectedRole, setSelectedRole] = useState<Role>();
  const [signInError, setSignInError] = useState<string>();

  const resolvedUser = useMemo<AuthenticatedUser | null>(() => {
    if (!isSignedIn || !clerkUser) return null;

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? '';
    return {
      email,
      name: clerkUser.fullName ?? clerkUser.firstName ?? email ?? 'Nutrix member',
      role: roleFromMetadata(clerkUser.publicMetadata),
    };
  }, [clerkUser, isSignedIn]);

  const selectedPortalMismatch = Boolean(
    selectedRole && resolvedUser && selectedRole !== resolvedUser.role,
  );

  useEffect(() => {
    if (!selectedPortalMismatch || !selectedRole) return;

    setSignInError(
      `This account is not authorized for the ${selectedRole} portal. Choose the role assigned by the Nutrix team.`,
    );
    void clerkSignOut();
  }, [clerkSignOut, selectedPortalMismatch, selectedRole]);

  const beginRoleLogin = useCallback((role: Role) => {
    setSelectedRole(role);
    setSignInError(undefined);
  }, []);

  const cancelRoleLogin = useCallback(() => {
    setSelectedRole(undefined);
  }, []);

  const clearSignInError = useCallback(() => {
    setSignInError(undefined);
  }, []);

  const signOut = useCallback(async () => {
    setSelectedRole(undefined);
    setSignInError(undefined);
    await clerkSignOut();
  }, [clerkSignOut]);

  const getSessionToken = useCallback(async () => {
    if (!isSignedIn) return null;
    return getToken();
  }, [getToken, isSignedIn]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady: isAuthLoaded && isUserLoaded,
      user: selectedPortalMismatch ? null : resolvedUser,
      signInError,
      beginRoleLogin,
      cancelRoleLogin,
      clearSignInError,
      getSessionToken,
      signOut,
    }),
    [
      beginRoleLogin,
      cancelRoleLogin,
      clearSignInError,
      getSessionToken,
      isAuthLoaded,
      isUserLoaded,
      resolvedUser,
      selectedPortalMismatch,
      signInError,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
