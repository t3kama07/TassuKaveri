import { Pet } from '@/types/pet';
import { createSupabaseAdminClient } from './supabaseAdmin';

type DateInput = Date | string | number | null | undefined;

export type SupabasePetInput = Partial<Omit<Pet, 'createdAt' | 'updatedAt'>> &
  Pick<Pet, 'id' | 'ownerId'> & {
    createdAt?: DateInput;
    updatedAt?: DateInput;
  };

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toIsoString(value: DateInput, fallback: Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return fallback.toISOString();
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}

function mapPetToSupabaseRow(pet: SupabasePetInput): Record<string, unknown> {
  const now = new Date();

  return {
    id: pet.id,
    owner_uid: pet.ownerId,
    name: asString(pet.name),
    pet_type: asString(pet.type, 'other'),
    breed: asString(pet.breed),
    age: asNumber(pet.age),
    pet_size: asString(pet.size, 'medium'),
    notes: asString(pet.notes),
    behaviour: asString(pet.behaviour),
    allergies: asString(pet.allergies),
    vaccination_status: asString(pet.vaccinationStatus),
    friendly_with_dogs: Boolean(pet.friendlyWithDogs),
    friendly_with_cats: Boolean(pet.friendlyWithCats),
    friendly_with_children: Boolean(pet.friendlyWithChildren),
    medication_required: Boolean(pet.medicationRequired),
    special_care_instructions: asString(pet.specialCareInstructions),
    emergency_vet_contact: asString(pet.emergencyVetContact),
    created_at: toIsoString(pet.createdAt, now),
    updated_at: toIsoString(pet.updatedAt, now),
  };
}

function mapSupabaseRowToPet(row: Record<string, unknown>): Pet {
  return {
    id: asString(row.id),
    ownerId: asString(row.owner_uid),
    name: asString(row.name),
    type: asString(row.pet_type, 'other') as Pet['type'],
    breed: asString(row.breed),
    age: asNumber(row.age),
    size: asString(row.pet_size, 'medium') as Pet['size'],
    notes: asString(row.notes),
    behaviour: asString(row.behaviour),
    aggressiveBehavior: asString(row.aggressive_behavior),
    medicalConditions: asString(row.medical_conditions),
    allergies: asString(row.allergies),
    vaccinationStatus: asString(row.vaccination_status),
    friendlyWithDogs: Boolean(row.friendly_with_dogs),
    friendlyWithCats: Boolean(row.friendly_with_cats),
    friendlyWithChildren: Boolean(row.friendly_with_children),
    medicationRequired: Boolean(row.medication_required),
    medicationInstructions: asString(row.medication_instructions),
    feedingInstructions: asString(row.feeding_instructions),
    specialCareInstructions: asString(row.special_care_instructions),
    escapeRisk: asString(row.escape_risk),
    childBehavior: asString(row.child_behavior),
    animalBehavior: asString(row.animal_behavior),
    veterinarianDetails: asString(row.veterinarian_details),
    emergencyVetContact: asString(row.emergency_vet_contact),
    emergencyContactInfo: asString(row.emergency_contact_info),
    createdAt: toDate(row.created_at) || new Date(),
    updatedAt: toDate(row.updated_at) || new Date(),
  };
}

export async function upsertPetsInSupabase(pets: SupabasePetInput[]): Promise<void> {
  if (!pets.length) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('pets')
    .upsert(pets.map(mapPetToSupabaseRow), { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to upsert pets in Supabase: ${error.message}`);
  }
}

export async function replaceOwnerPetsInSupabase(
  ownerId: string,
  pets: SupabasePetInput[]
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase.from('pets').delete().eq('owner_uid', ownerId);

  if (deleteError) {
    throw new Error(`Failed to replace pets in Supabase: ${deleteError.message}`);
  }

  await upsertPetsInSupabase(pets);
}

export async function deletePetsInSupabase(ownerId: string, petIds: string[]): Promise<void> {
  if (!petIds.length) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('pets')
    .delete()
    .eq('owner_uid', ownerId)
    .in('id', petIds);

  if (error) {
    throw new Error(`Failed to delete pets in Supabase: ${error.message}`);
  }
}

export async function getOwnerPetsFromSupabase(ownerId: string): Promise<Pet[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_uid', ownerId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to read pets from Supabase: ${error.message}`);
  }

  return (data ?? []).map((row) => mapSupabaseRowToPet(row as Record<string, unknown>));
}

export async function getPetFromSupabase(
  ownerId: string,
  petId: string
): Promise<Pet | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_uid', ownerId)
    .eq('id', petId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read pet from Supabase: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapSupabaseRowToPet(data as Record<string, unknown>);
}
