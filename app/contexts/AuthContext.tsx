'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createProfile, profileExists, setEmailVerifiedStatus } from '@/lib/profileService';
import { initializeWallet } from '@/lib/walletService';
import { CreateProfileData } from '@/types/profile';

interface AuthContextType {
  user: User | null;
  loading: boolean;
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
    location: 'Helsinki',
    country: 'Finland',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function ensureUserBootstrap(
    authUser: User,
    profileData?: CreateProfileData,
    overwriteProfile: boolean = false
  ): Promise<void> {
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

    await initializeWallet(authUser.uid);
    await setEmailVerifiedStatus(authUser.uid, authUser.emailVerified);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        try {
          await ensureUserBootstrap(nextUser);
        } catch (error) {
          console.error('Failed to bootstrap signed-in user:', error);
        }
        setUser(auth.currentUser ?? nextUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await credential.user.reload();
    const currentUser = auth.currentUser ?? credential.user;
    await ensureUserBootstrap(currentUser);
    setUser(currentUser);
    return credential;
  };

  const signup = async (email: string, password: string, profileData: CreateProfileData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await ensureUserBootstrap(userCredential.user, profileData, true);
    setUser(auth.currentUser ?? userCredential.user);

    return userCredential;
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    user,
    loading,
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
