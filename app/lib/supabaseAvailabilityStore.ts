import { AvailabilitySlot } from '@/types/availability';
import { createSupabaseAdminClient } from './supabaseAdmin';

type DateInput = Date | string | number | null | undefined;
type SupabaseAvailabilitySlotRow = {
  id: string;
  user_uid: string;
  start_at: string;
  end_at: string;
  created_at: string;
  updated_at: string;
};

export type SupabaseAvailabilitySlotInput = Partial<
  Omit<AvailabilitySlot, 'startAt' | 'endAt' | 'createdAt' | 'updatedAt'>
> &
  Pick<AvailabilitySlot, 'id' | 'userId'> & {
    startAt?: DateInput;
    endAt?: DateInput;
    createdAt?: DateInput;
    updatedAt?: DateInput;
  };

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

function toDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function mapAvailabilitySlotToSupabaseRow(
  slot: SupabaseAvailabilitySlotInput
): Record<string, unknown> {
  const now = new Date();

  return {
    id: slot.id,
    user_uid: slot.userId,
    start_at: toIsoString(slot.startAt, now),
    end_at: toIsoString(slot.endAt, now),
    created_at: toIsoString(slot.createdAt, now),
    updated_at: toIsoString(slot.updatedAt, now),
  };
}

function mapSupabaseAvailabilitySlotRow(row: SupabaseAvailabilitySlotRow): AvailabilitySlot {
  return {
    id: row.id,
    userId: row.user_uid,
    startAt: toDate(row.start_at),
    endAt: toDate(row.end_at),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

export async function replaceAvailabilitySlotsInSupabase(
  userId: string,
  slots: SupabaseAvailabilitySlotInput[]
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from('availability_slots')
    .delete()
    .eq('user_uid', userId);

  if (deleteError) {
    throw new Error(`Failed to replace availability slots in Supabase: ${deleteError.message}`);
  }

  if (!slots.length) {
    return;
  }

  const { error: insertError } = await supabase
    .from('availability_slots')
    .upsert(slots.map(mapAvailabilitySlotToSupabaseRow), { onConflict: 'id' });

  if (insertError) {
    throw new Error(`Failed to upsert availability slots in Supabase: ${insertError.message}`);
  }
}

export async function getAvailabilitySlotsFromSupabase(
  userId: string
): Promise<AvailabilitySlot[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('user_uid', userId)
    .order('start_at', { ascending: true })
    .returns<SupabaseAvailabilitySlotRow[]>();

  if (error) {
    throw new Error(`Failed to read availability slots from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseAvailabilitySlotRow);
}
