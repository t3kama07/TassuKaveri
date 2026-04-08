'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  createProfile,
  ensurePilotLocation,
  getProfile,
  profileExists,
  setEmailVerifiedStatus,
} from '@/lib/profileService';
import { PILOT_CITY, PILOT_COUNTRY } from '@/lib/platformPolicy';
import { initializeWallet } from '@/lib/walletService';
import { CreateProfileData, UserProfile } from '@/types/profile';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  login: (email: string, password: string) => Promise<UserCredential>;
  signup: (email: string, password: string, profileData: CreateProfileData) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

function formatFallbackName(user: User): string {
  const displayName = user.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  const emailLocalPart = user.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (emailLocalPart) {
    return emailLocalPart;
  }

  return 'PetBuddy User';
}

function getBootstrapProfileData(user: User): CreateProfileData {
  return {
    name: formatFallbackName(user),
    location: PILOT_CITY,
    country: PILOT_COUNTRY,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapPromisesRef = useRef(new Map<string, Promise<UserProfile | null>>());

  async function ensureUserBootstrap(
    authUser: User,
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

      // Warm the auth token before any protected Firestore reads/writes.
      await authUser.getIdToken();

      const hasProfile = await profileExists(authUser.uid);
      if (overwriteProfile && profileData) {
        await createProfile(authUser.uid, email, profileData);
      } else if (!hasProfile) {
        await createProfile(authUser.uid, email, profileData ?? getBootstrapProfileData(authUser));
      }

      await ensurePilotLocation(authUser.uid);
      await initializeWallet(authUser.uid);
      await setEmailVerifiedStatus(authUser.uid, authUser.emailVerified);
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

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        try {
          const bootstrappedProfile = await ensureUserBootstrap(nextUser);
          if (active) {
            setProfile(bootstrappedProfile);
          }
        } catch (error) {
          console.error('Failed to bootstrap signed-in user:', error);
          if (active) {
            setProfile(null);
          }
        }
        if (active) {
          setUser(auth.currentUser ?? nextUser);
        }
      } else {
        if (active) {
          setUser(null);
          setProfile(null);
        }
      }
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await credential.user.reload();
    const currentUser = auth.currentUser ?? credential.user;
    const bootstrappedProfile = await ensureUserBootstrap(currentUser);
    setUser(currentUser);
    setProfile(bootstrappedProfile);
    return credential;
  };

  const signup = async (email: string, password: string, profileData: CreateProfileData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    const bootstrappedProfile = await ensureUserBootstrap(userCredential.user, profileData, true);
    setUser(auth.currentUser ?? userCredential.user);
    setProfile(bootstrappedProfile);

    return userCredential;
  };

  const refreshProfile = async () => {
    const currentUser = auth.currentUser ?? user;
    if (!currentUser) {
      setProfile(null);
      return null;
    }

    const nextProfile = await getProfile(currentUser.uid);
    setProfile(nextProfile);
    return nextProfile;
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    user,
    profile,
    loading,
    refreshProfile,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
