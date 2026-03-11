import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from './firebase';
import { FavoriteSitter } from '@/types/favorite';
import { getProfile } from './profileService';
import { UserProfile } from '@/types/profile';

function getFavoritesRef() {
  return collection(db, 'favorites');
}

export async function addFavoriteSitter(ownerId: string, sitterId: string): Promise<void> {
  if (ownerId === sitterId) {
    throw new Error('You cannot favorite yourself');
  }

  const existingQuery = query(
    getFavoritesRef(),
    where('ownerId', '==', ownerId),
    where('sitterId', '==', sitterId)
  );
  const existingSnapshot = await getDocs(existingQuery);
  if (!existingSnapshot.empty) {
    return;
  }

  await addDoc(getFavoritesRef(), {
    ownerId,
    sitterId,
    createdAt: serverTimestamp(),
  });
}

export async function removeFavoriteSitter(ownerId: string, sitterId: string): Promise<void> {
  const existingQuery = query(
    getFavoritesRef(),
    where('ownerId', '==', ownerId),
    where('sitterId', '==', sitterId)
  );
  const snapshot = await getDocs(existingQuery);

  await Promise.all(snapshot.docs.map((favoriteDoc) => deleteDoc(doc(db, 'favorites', favoriteDoc.id))));
}

export async function getFavoriteSitters(ownerId: string): Promise<FavoriteSitter[]> {
  const q = query(getFavoritesRef(), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);

  const favorites: FavoriteSitter[] = [];
  snapshot.forEach((favoriteDoc) => {
    const data = favoriteDoc.data();
    favorites.push({
      id: favoriteDoc.id,
      ownerId: data.ownerId,
      sitterId: data.sitterId,
      createdAt: data.createdAt?.toDate() || new Date(),
    });
  });

  favorites.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return favorites;
}

export async function getFavoriteSitterProfiles(ownerId: string): Promise<UserProfile[]> {
  const favorites = await getFavoriteSitters(ownerId);
  const profiles = await Promise.all(favorites.map((favorite) => getProfile(favorite.sitterId)));
  return profiles.filter((profile): profile is UserProfile => profile !== null);
}
