'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  UserCredential,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createProfile, setEmailVerifiedStatus } from '@/lib/profileService';
import { initializeWallet } from '@/lib/walletService';
import { CreateProfileData } from '@/types/profile';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserCredential>;
  signup: (email: string, password: string, profileData: CreateProfileData) => Promise<UserCredential>;
  sendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          await setEmailVerifiedStatus(user.uid, user.emailVerified);
        } catch {
          // non-blocking sync
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await credential.user.reload();
    setUser(auth.currentUser);
    try {
      await setEmailVerifiedStatus(credential.user.uid, credential.user.emailVerified);
    } catch {
      // non-blocking sync
    }
    return credential;
  };

  const signup = async (email: string, password: string, profileData: CreateProfileData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Auto-create profile document
    await createProfile(userCredential.user.uid, email, profileData);
    
    // Auto-initialize wallet with starter credits
    await initializeWallet(userCredential.user.uid);

    // Email verification for launch trust baseline
    await sendEmailVerification(userCredential.user);
    try {
      await setEmailVerifiedStatus(userCredential.user.uid, userCredential.user.emailVerified);
    } catch {
      // non-blocking sync
    }
    
    return userCredential;
  };

  const sendVerificationEmailFn = async () => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user');
    }
    await sendEmailVerification(auth.currentUser);
  };

  const refreshUser = async () => {
    if (!auth.currentUser) {
      return false;
    }
    await auth.currentUser.reload();
    setUser(auth.currentUser);
    try {
      await setEmailVerifiedStatus(auth.currentUser.uid, auth.currentUser.emailVerified);
    } catch {
      // non-blocking sync
    }
    return auth.currentUser.emailVerified;
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    sendVerificationEmail: sendVerificationEmailFn,
    refreshUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
