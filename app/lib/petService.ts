import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Pet, CreatePetData, UpdatePetData } from '@/types/pet';

/**
 * Get the pets subcollection reference for a user
 */
function getUserPetsCollection(ownerId: string) {
  return collection(db, 'users', ownerId, 'pets');
}

/**
 * Create a new pet in user's subcollection
 */
export async function createPet(ownerId: string, data: CreatePetData): Promise<string> {
  const petsRef = getUserPetsCollection(ownerId);
  const docRef = await addDoc(petsRef, {
    name: data.name,
    type: data.type,
    breed: data.breed,
    age: data.age,
    size: data.size,
    notes: data.notes,
    behaviour: data.behaviour || '',
    allergies: data.allergies || '',
    vaccinationStatus: data.vaccinationStatus || '',
    friendlyWithDogs: Boolean(data.friendlyWithDogs),
    friendlyWithCats: Boolean(data.friendlyWithCats),
    friendlyWithChildren: Boolean(data.friendlyWithChildren),
    medicationRequired: Boolean(data.medicationRequired),
    specialCareInstructions: data.specialCareInstructions || '',
    emergencyVetContact: data.emergencyVetContact || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get a single pet by ID from user's subcollection
 */
export async function getPet(ownerId: string, petId: string): Promise<Pet | null> {
  const petRef = doc(db, 'users', ownerId, 'pets', petId);
  const petSnap = await getDoc(petRef);

  if (!petSnap.exists()) {
    return null;
  }

  const data = petSnap.data();
  return {
    id: petSnap.id,
    ownerId,
    name: data.name,
    type: data.type,
    breed: data.breed,
    age: data.age,
    size: data.size,
    notes: data.notes,
    behaviour: data.behaviour || '',
    allergies: data.allergies || '',
    vaccinationStatus: data.vaccinationStatus || '',
    friendlyWithDogs: Boolean(data.friendlyWithDogs),
    friendlyWithCats: Boolean(data.friendlyWithCats),
    friendlyWithChildren: Boolean(data.friendlyWithChildren),
    medicationRequired: Boolean(data.medicationRequired),
    specialCareInstructions: data.specialCareInstructions || '',
    emergencyVetContact: data.emergencyVetContact || '',
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all pets for a specific owner from their subcollection
 */
export async function getUserPets(ownerId: string): Promise<Pet[]> {
  const petsRef = getUserPetsCollection(ownerId);
  const querySnapshot = await getDocs(petsRef);

  const pets: Pet[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    pets.push({
      id: doc.id,
      ownerId,
      name: data.name,
      type: data.type,
      breed: data.breed,
      age: data.age,
      size: data.size,
      notes: data.notes,
      behaviour: data.behaviour || '',
      allergies: data.allergies || '',
      vaccinationStatus: data.vaccinationStatus || '',
      friendlyWithDogs: Boolean(data.friendlyWithDogs),
      friendlyWithCats: Boolean(data.friendlyWithCats),
      friendlyWithChildren: Boolean(data.friendlyWithChildren),
      medicationRequired: Boolean(data.medicationRequired),
      specialCareInstructions: data.specialCareInstructions || '',
      emergencyVetContact: data.emergencyVetContact || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });

  return pets;
}

/**
 * Update a pet in user's subcollection
 */
export async function updatePet(ownerId: string, petId: string, data: UpdatePetData): Promise<void> {
  const petRef = doc(db, 'users', ownerId, 'pets', petId);
  
  // Verify pet exists
  const petSnap = await getDoc(petRef);
  if (!petSnap.exists()) {
    throw new Error('Pet not found');
  }

  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  await updateDoc(petRef, {
    ...filteredData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a pet from user's subcollection
 */
export async function deletePet(ownerId: string, petId: string): Promise<void> {
  const petRef = doc(db, 'users', ownerId, 'pets', petId);
  
  // Verify pet exists
  const petSnap = await getDoc(petRef);
  if (!petSnap.exists()) {
    throw new Error('Pet not found');
  }

  await deleteDoc(petRef);
}

/**
 * Verify if a pet exists in user's subcollection
 */
export async function verifyPetOwnership(ownerId: string, petId: string): Promise<boolean> {
  const petRef = doc(db, 'users', ownerId, 'pets', petId);
  const petSnap = await getDoc(petRef);
  
  return petSnap.exists();
}
