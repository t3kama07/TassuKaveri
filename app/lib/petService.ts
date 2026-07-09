import { Pet, CreatePetData, UpdatePetData } from '@/types/pet';
import { deletePetsFromSupabase, mirrorPetsToSupabase } from './supabaseMirrorClient';
import { fetchSupabaseReadJson } from './supabaseReadClient';

function generatePetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapPetRecord(id: string, ownerId: string, data: Record<string, unknown>): Pet {
  return {
    id,
    ownerId,
    name: (data.name as string) || '',
    type: ((data.type as Pet['type']) || 'other'),
    breed: (data.breed as string) || '',
    age: typeof data.age === 'number' && Number.isFinite(data.age) ? data.age : 0,
    size: ((data.size as Pet['size']) || 'medium'),
    notes: (data.notes as string) || '',
    behaviour: (data.behaviour as string) || '',
    aggressiveBehavior: (data.aggressiveBehavior as string) || '',
    medicalConditions: (data.medicalConditions as string) || '',
    allergies: (data.allergies as string) || '',
    vaccinationStatus: (data.vaccinationStatus as string) || '',
    friendlyWithDogs: Boolean(data.friendlyWithDogs),
    friendlyWithCats: Boolean(data.friendlyWithCats),
    friendlyWithChildren: Boolean(data.friendlyWithChildren),
    medicationRequired: Boolean(data.medicationRequired),
    medicationInstructions: (data.medicationInstructions as string) || '',
    feedingInstructions: (data.feedingInstructions as string) || '',
    specialCareInstructions: (data.specialCareInstructions as string) || '',
    escapeRisk: (data.escapeRisk as string) || '',
    childBehavior: (data.childBehavior as string) || '',
    animalBehavior: (data.animalBehavior as string) || '',
    veterinarianDetails: (data.veterinarianDetails as string) || '',
    emergencyVetContact: (data.emergencyVetContact as string) || '',
    emergencyContactInfo: (data.emergencyContactInfo as string) || '',
    createdAt:
      typeof data.createdAt === 'string' || typeof data.createdAt === 'number'
        ? new Date(data.createdAt)
        : ((data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date()),
    updatedAt:
      typeof data.updatedAt === 'string' || typeof data.updatedAt === 'number'
        ? new Date(data.updatedAt)
        : ((data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date()),
  };
}

async function savePets(
  ownerId: string,
  pets: Pet[],
  action: 'upsert' | 'replace' = 'upsert'
): Promise<void> {
  await mirrorPetsToSupabase(ownerId, pets, action);
}

export async function createPet(ownerId: string, data: CreatePetData): Promise<string> {
  const id = generatePetId();
  const now = new Date();

  await savePets(ownerId, [
    {
      id,
      ownerId,
      name: data.name,
      type: data.type,
      breed: data.breed,
      age: data.age,
      size: data.size,
      notes: data.notes,
      behaviour: data.behaviour || '',
      aggressiveBehavior: data.aggressiveBehavior || '',
      medicalConditions: data.medicalConditions || '',
      allergies: data.allergies || '',
      vaccinationStatus: data.vaccinationStatus || '',
      friendlyWithDogs: Boolean(data.friendlyWithDogs),
      friendlyWithCats: Boolean(data.friendlyWithCats),
      friendlyWithChildren: Boolean(data.friendlyWithChildren),
      medicationRequired: Boolean(data.medicationRequired),
      medicationInstructions: data.medicationInstructions || '',
      feedingInstructions: data.feedingInstructions || '',
      specialCareInstructions: data.specialCareInstructions || '',
      escapeRisk: data.escapeRisk || '',
      childBehavior: data.childBehavior || '',
      animalBehavior: data.animalBehavior || '',
      veterinarianDetails: data.veterinarianDetails || '',
      emergencyVetContact: data.emergencyVetContact || '',
      emergencyContactInfo: data.emergencyContactInfo || '',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  return id;
}

export async function getPet(ownerId: string, petId: string): Promise<Pet | null> {
  const payload = await fetchSupabaseReadJson<{ pet: Record<string, unknown> | null }>(
    `/api/supabase-read/pets?ownerId=${encodeURIComponent(ownerId)}&petId=${encodeURIComponent(petId)}`,
    { requireAuth: true }
  );

  return payload.pet ? mapPetRecord(petId, ownerId, payload.pet) : null;
}

export async function getUserPets(ownerId: string): Promise<Pet[]> {
  const payload = await fetchSupabaseReadJson<{ pets: Array<Record<string, unknown>> }>(
    `/api/supabase-read/pets?ownerId=${encodeURIComponent(ownerId)}`,
    { requireAuth: true }
  );

  return payload.pets.map((pet) => mapPetRecord((pet.id as string) || '', ownerId, pet));
}

export async function updatePet(ownerId: string, petId: string, data: UpdatePetData): Promise<void> {
  const currentPet = await getPet(ownerId, petId);
  if (!currentPet) {
    throw new Error('Pet not found');
  }

  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  await savePets(ownerId, [
    {
      ...currentPet,
      ...filteredData,
      updatedAt: new Date(),
    },
  ]);
}

export async function deletePet(ownerId: string, petId: string): Promise<void> {
  const currentPet = await getPet(ownerId, petId);
  if (!currentPet) {
    throw new Error('Pet not found');
  }

  await deletePetsFromSupabase(ownerId, [petId]);
}

export async function verifyPetOwnership(ownerId: string, petId: string): Promise<boolean> {
  const pet = await getPet(ownerId, petId);
  return Boolean(pet);
}
