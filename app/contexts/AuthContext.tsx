'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  createProfile,
  ensureSupportedLocation,
  getProfile,
  profileExists,
  setEmailVerifiedStatus,
} from '@/lib/profileService';
import { PILOT_CITY, PILOT_COUNTRY } from '@/lib/platformPolicy';
import { initializeWallet } from '@/lib/walletService';
import { CreateProfileData, UserProfile } from '@/types/profile';
import type { AuthUser } from '@/types/auth';
import { mapSupabaseUserToAuthUser } from '@/lib/supabaseAuthClient';
import { acceptLatestLegalDocuments, getLegalAcceptanceStatus } from '@/lib/legalAcceptanceService';
import {
  clearPendingGoogleSignupConsent,
  hasPendingGoogleSignupConsent,
} from '@/lib/googleSignupConsent';

type SignupResult = {
  user: AuthUser | null;
  requiresEmailVerification: boolean;
  email: string;
};

type GoogleAuthIntent = 'login' | 'signup';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  signInWithGoogle: (intent?: GoogleAuthIntent) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<string>;
  updatePassword: (password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    profileData: CreateProfileData
  ) => Promise<SignupResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

function formatFallbackName(user: AuthUser): string {
  const emailLocalPart = user.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (emailLocalPart) {
    return emailLocalPart;
  }

  return 'PetBuddy User';
}

function getBootstrapProfileData(user: AuthUser): CreateProfileData {
  return {
    name: formatFallbackName(user),
    location: PILOT_CITY,
    country: PILOT_COUNTRY,
  };
}

function normalizeSignupProfileData(
  user: AuthUser,
  profileData: CreateProfileData
): CreateProfileData {
  const trimmedName = profileData.name.trim();
  const trimmedLocation = profileData.location.trim();
  const trimmedCountry = profileData.country?.trim();

  return {
    name: trimmedName || formatFallbackName(user),
    location: trimmedLocation || PILOT_CITY,
    country: trimmedCountry || PILOT_COUNTRY,
  };
}

async function signOutSupabaseQuietly(): Promise<void> {
  await supabase.auth.signOut().catch(() => undefined);
}

function isEmailConfirmationRequiredError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return (
    message.includes('email not confirmed') ||
    message.includes('email_not_confirmed') ||
    message.includes('confirm your email')
  );
}

function isEmailRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return (
    message.includes('email rate limit exceeded') ||
    message.includes('over_email_send_rate_limit')
  );
}

function normalizeAuthError(error: unknown): Error {
  if (isEmailConfirmationRequiredError(error)) {
    return new Error('Please confirm your email before logging in.');
  }

  if (isEmailRateLimitError(error)) {
    return new Error('Too many signup emails were sent recently. Please wait a minute and try again.');
  }

  return error instanceof Error ? error : new Error('Unknown authentication error');
}

function normalizeEmailForAuth(email: string): string {
  const normalizedEmail = email
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  const extractedEmail = normalizedEmail.match(/<([^<>]+)>/)?.[1] ?? normalizedEmail;

  return extractedEmail.replace(/["'`“”‘’]/g, '').replace(/\s+/g, '').toLowerCase();
}

function getGoogleAuthIntent(): GoogleAuthIntent {
  if (typeof window === 'undefined') {
    return 'signup';
  }

  return window.sessionStorage.getItem('tassukaveri_google_auth_intent') === 'login'
    ? 'login'
    : 'signup';
}

async function signInSupabaseWithPassword(email: string, password: string): Promise<Session | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw normalizeAuthError(error);
  }

  return data.session ?? null;
}

async function signUpSupabaseWithPassword(email: string, password: string): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw normalizeAuthError(error);
  }

  return data.session ?? null;
}

async function sendSupabasePasswordReset(email: string): Promise<void> {
  const redirectTo =
    typeof window === 'undefined' ? undefined : `${window.location.origin}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw normalizeAuthError(error);
  }
}

async function ensureSupabasePasswordSession(email: string, password: string): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (session?.user.email?.trim().toLowerCase() === email.trim().toLowerCase()) {
    return session;
  }

  return signInSupabaseWithPassword(email, password);
}

async function getCurrentSupabaseAuthUser(): Promise<AuthUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return user ? mapSupabaseUserToAuthUser(user) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const supabaseSessionRef = useRef<Session | null>(null);
  const bootstrapPromisesRef = useRef(new Map<string, Promise<UserProfile | null>>());
  const supabaseUserId = supabaseSession?.user?.id ?? null;
  supabaseSessionRef.current = supabaseSession;

  async function ensureUserBootstrap(
    authUser: AuthUser,
    profileData?: CreateProfileData,
    overwriteProfile: boolean = false
  ): Promise<UserProfile | null> {
    const existingPromise = bootstrapPromisesRef.current.get(authUser.uid);
    if (existingPromise) {
      if (!overwriteProfile || !profileData) {
        return existingPromise;
      }

      await existingPromise;
    }

    const bootstrapPromise = (async () => {
      const email = authUser.email;
      if (!email) {
        throw new Error('Authenticated user is missing an email address');
      }

      const hasProfile = await profileExists(authUser.uid);
      if (!overwriteProfile && getGoogleAuthIntent() === 'login') {
        const legalStatus = hasProfile
          ? await getLegalAcceptanceStatus(authUser.uid).catch(() => ({ accepted: false }))
          : { accepted: false };

        if (!hasProfile || !legalStatus.accepted) {
          await signOutSupabaseQuietly();
          throw new Error('Please register first before using Google login.');
        }
      }

      if (overwriteProfile && profileData) {
        await createProfile(authUser.uid, email, profileData);
      } else if (!hasProfile) {
        await createProfile(
          authUser.uid,
          email,
          profileData ?? getBootstrapProfileData(authUser)
        );
      }

      await ensureSupportedLocation(authUser.uid);
      await initializeWallet(authUser.uid);
      await setEmailVerifiedStatus(authUser.uid, authUser.emailVerified);

      if (hasPendingGoogleSignupConsent()) {
        try {
          await acceptLatestLegalDocuments(authUser.uid);
          clearPendingGoogleSignupConsent();
        } catch (acceptanceError) {
          // Keep the pending marker so LegalAcceptanceGate can retry after navigation.
          console.error('Failed to finalize Google signup legal acceptance:', acceptanceError);
        }
      }

      return getProfile(authUser.uid);
    })();

    bootstrapPromisesRef.current.set(authUser.uid, bootstrapPromise);

    try {
      return await bootstrapPromise;
    } finally {
      bootstrapPromisesRef.current.delete(authUser.uid);
    }
  }

  useEffect(() => {
    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          console.error('Failed to restore Supabase session:', error);
        }

        setSupabaseSession(data.session ?? null);
        setSupabaseReady(true);
      })
      .catch((error) => {
        console.error('Failed to initialize Supabase session:', error);
        if (active) {
          setSupabaseSession(null);
          setSupabaseReady(true);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setSupabaseSession(session);
      setSupabaseReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!supabaseReady) {
      return () => {
        active = false;
      };
    }

    async function reconcileSession() {
      setLoading(true);

      const currentSession = supabaseSessionRef.current;

      if (!currentSession?.user) {
        if (active) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        const currentUser = mapSupabaseUserToAuthUser(currentSession.user);
        const bootstrappedProfile = await ensureUserBootstrap(currentUser);
        if (active) {
          setUser(currentUser);
          setProfile(bootstrappedProfile);
        }
      } catch (error) {
        console.error('Failed to bootstrap signed-in user:', error);
        if (active) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void reconcileSession();

    return () => {
      active = false;
    };
  }, [supabaseReady, supabaseUserId]);

  const login = async (email: string, password: string) => {
    const trimmedEmail = normalizeEmailForAuth(email);
    const trimmedPassword = password.trim();
    setLoading(true);

    try {
      await signInSupabaseWithPassword(trimmedEmail, trimmedPassword);
      const currentUser = await getCurrentSupabaseAuthUser();
      if (!currentUser) {
        throw new Error('Supabase session was not created');
      }

      const bootstrappedProfile = await ensureUserBootstrap(currentUser);
      setUser(currentUser);
      setProfile(bootstrappedProfile);
      setLoading(false);
      return currentUser;
    } catch (error) {
      await signOutSupabaseQuietly();
      setLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async (intent: GoogleAuthIntent = 'signup') => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('tassukaveri_google_auth_intent', intent);
      if (intent === 'login') {
        clearPendingGoogleSignupConsent();
      }
    }

    const redirectTo =
      typeof window === 'undefined'
        ? undefined
        : `${window.location.origin}/auth/callback?intent=${intent}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      throw normalizeAuthError(error);
    }
  };

  const sendPasswordReset = async (email: string) => {
    const trimmedEmail = normalizeEmailForAuth(email);

    if (!trimmedEmail) {
      throw new Error('Enter the email address for your account.');
    }

    await sendSupabasePasswordReset(trimmedEmail);
    return trimmedEmail;
  };

  const updatePassword = async (password: string) => {
    const trimmedPassword = password.trim();

    if (trimmedPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const { error } = await supabase.auth.updateUser({
      password: trimmedPassword,
    });

    if (error) {
      throw normalizeAuthError(error);
    }
  };

  const signup = async (email: string, password: string, profileData: CreateProfileData) => {
    const trimmedEmail = normalizeEmailForAuth(email);
    const trimmedPassword = password.trim();
    setLoading(true);

    try {
      const signUpSession = await signUpSupabaseWithPassword(trimmedEmail, trimmedPassword);

      if (!signUpSession) {
        try {
          await ensureSupabasePasswordSession(trimmedEmail, trimmedPassword);
        } catch (error) {
          if (isEmailConfirmationRequiredError(error)) {
            await signOutSupabaseQuietly();
            setUser(null);
            setProfile(null);
            setLoading(false);

            return {
              user: null,
              requiresEmailVerification: true,
              email: trimmedEmail,
            };
          }

          throw error;
        }
      }

      const currentUser = await getCurrentSupabaseAuthUser();
      if (!currentUser) {
        throw new Error('Supabase session was not created');
      }

      const normalizedProfileData = normalizeSignupProfileData(currentUser, profileData);
      const bootstrappedProfile = await ensureUserBootstrap(currentUser, normalizedProfileData, true);
      setUser(currentUser);
      setProfile(bootstrappedProfile);
      setLoading(false);

      return {
        user: currentUser,
        requiresEmailVerification: false,
        email: trimmedEmail,
      };
    } catch (error) {
      await signOutSupabaseQuietly();
      setLoading(false);
      throw normalizeAuthError(error);
    }
  };

  const refreshProfile = async () => {
    const currentUser = user ?? (await getCurrentSupabaseAuthUser());
    if (!currentUser) {
      setProfile(null);
      return null;
    }

    const nextProfile = await getProfile(currentUser.uid);
    setProfile(nextProfile);
    return nextProfile;
  };

  const logout = async () => {
    setLoading(true);
    await signOutSupabaseQuietly();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const value = {
    user,
    profile,
    loading,
    refreshProfile,
    login,
    signInWithGoogle,
    sendPasswordReset,
    updatePassword,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
