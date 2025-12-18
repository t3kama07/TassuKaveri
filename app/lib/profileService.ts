import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, CreateProfileData, UpdateProfileData } from '@/types/profile';

const USERS_COLLECTION = 'users';

/**
 * Create a new user profile in Firestore
 */
export async function createProfile(
  uid: string,
  email: string,
  data: CreateProfileData
): Promise<void> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(profileRef, {
    uid,
    email,
    name: data.name,
    location: data.location,
    role: data.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get a user profile from Firestore
 */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    return null;
  }

  const data = profileSnap.data();
  return {
    uid: data.uid,
    email: data.email,
    name: data.name,
    location: data.location,
    role: data.role,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Update a user profile in Firestore
 */
export async function updateProfile(
  uid: string,
  data: UpdateProfileData
): Promise<void> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(profileRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if a profile exists
 */
export async function profileExists(uid: string): Promise<boolean> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const profileSnap = await getDoc(profileRef);
  return profileSnap.exists();
}
