'use client';

import { useEffect, useState } from 'react';
import {
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  getAvailabilitySlots,
  getUpcomingAvailabilitySlots,
  updateAvailabilitySlot,
} from '@/lib/availabilityService';
import { AvailabilitySlot } from '@/types/availability';
import { useLanguage } from '@/contexts/LanguageContext';

interface AvailabilityPlannerProps {
  userId: string;
}

interface AvailabilityEditorState {
  mode: 'create' | 'edit';
  slotId?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

function padNumber(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function toTimeInputValue(date: Date): string {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function parseDateInputValue(dateValue: string): Date {
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function combineDateAndTime(dateValue: string, timeValue: string): Date {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function formatDateText(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(startAt: Date, endAt: Date): string {
  const totalMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatDateRange(slot: AvailabilitySlot): string {
  const startText = formatDateText(slot.startAt);
  const endText = formatDateText(slot.endAt);
  return startText === endText ? startText : `${startText} - ${endText}`;
}

function formatTimeRange(slot: AvailabilitySlot): string {
  return `${toTimeInputValue(slot.startAt)} - ${toTimeInputValue(slot.endAt)} (${formatDuration(slot.startAt, slot.endAt)})`;
}

function createDefaultEditorValues(): Omit<AvailabilityEditorState, 'mode' | 'slotId'> {
  const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  startAt.setSeconds(0, 0);

  const roundedMinutes = startAt.getMinutes() === 0 ? 0 : startAt.getMinutes() <= 30 ? 30 : 60;
  if (roundedMinutes === 60) {
    startAt.setHours(startAt.getHours() + 1, 0, 0, 0);
  } else {
    startAt.setMinutes(roundedMinutes, 0, 0);
  }

  const endAt = new Date(startAt.getTime() + 4 * 60 * 60 * 1000);

  return {
    startDate: toDateInputValue(startAt),
    endDate: toDateInputValue(endAt),
    startTime: toTimeInputValue(startAt),
    endTime: toTimeInputValue(endAt),
  };
}

function createCreateEditorState(): AvailabilityEditorState {
  return {
    mode: 'create',
    ...createDefaultEditorValues(),
  };
}

function createEditEditorState(slot: AvailabilitySlot): AvailabilityEditorState {
  return {
    mode: 'edit',
    slotId: slot.id,
    startDate: toDateInputValue(slot.startAt),
    endDate: toDateInputValue(slot.endAt),
    startTime: toTimeInputValue(slot.startAt),
    endTime: toTimeInputValue(slot.endAt),
  };
}

async function fetchUpcomingSlots(userId: string): Promise<AvailabilitySlot[]> {
  const data = await getAvailabilitySlots(userId);
  return getUpcomingAvailabilitySlots(data);
}

export default function AvailabilityPlanner({
  userId,
}: AvailabilityPlannerProps) {
  const { t } = useLanguage();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<AvailabilityEditorState | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadInitialSlots() {
      try {
        setLoading(true);
        const nextSlots = await fetchUpcomingSlots(userId);
        if (active) {
          setSlots(nextSlots);
        }
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(t('We could not load your times right now. Please try again. ', 'Vapaita aikojasi ei voitu ladata. Yritä uudelleen. ') + message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialSlots();

    return () => {
      active = false;
    };
  }, [t, userId]);

  async function refreshSlots() {
    try {
      setLoading(true);
      setSlots(await fetchUpcomingSlots(userId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not load your times right now. Please try again. ', 'Vapaita aikojasi ei voitu ladata. Yritä uudelleen. ') + message);
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  function openCreateEditor() {
    clearMessages();
    setEditor(createCreateEditorState());
  }

  function openEditEditor(slot: AvailabilitySlot) {
    clearMessages();
    setEditor(createEditEditorState(slot));
  }

  function closeEditor() {
    setEditor(null);
  }

  function updateEditorField(
    field: 'startDate' | 'endDate' | 'startTime' | 'endTime',
    value: string
  ) {
    setEditor((currentEditor) => {
      if (!currentEditor) {
        return currentEditor;
      }

      const nextEditor = {
        ...currentEditor,
        [field]: value,
      };

      if (
        field === 'startDate'
        && parseDateInputValue(nextEditor.startDate).getTime() > parseDateInputValue(nextEditor.endDate).getTime()
      ) {
        nextEditor.endDate = nextEditor.startDate;
      }

      if (
        field === 'endDate'
        && parseDateInputValue(nextEditor.endDate).getTime() < parseDateInputValue(nextEditor.startDate).getTime()
      ) {
        nextEditor.endDate = nextEditor.startDate;
      }

      return nextEditor;
    });
  }

  async function handleSaveEditor() {
    if (!editor) {
      return;
    }

    try {
      setSaving(true);
      clearMessages();

      const range = {
        startAt: combineDateAndTime(editor.startDate, editor.startTime),
        endAt: combineDateAndTime(editor.endDate, editor.endTime),
      };

      if (editor.mode === 'edit' && editor.slotId) {
        await updateAvailabilitySlot(userId, editor.slotId, range);
        setSuccess(t('Time slot updated.', 'Vapaa aika päivitetty.'));
      } else {
        await createAvailabilitySlot(userId, range);
        setSuccess(t('Time slot added.', 'Vapaa aika lisätty.'));
      }

      setEditor(null);
      await refreshSlots();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t(
        `${editor.mode === 'edit' ? 'We could not update this time' : 'We could not add this time'}. Please check the dates and try again. ${message}`,
        `${editor.mode === 'edit' ? 'Tätä aikaa ei voitu päivittää' : 'Tätä aikaa ei voitu lisätä'}. Tarkista päivämäärät ja yritä uudelleen. ${message}`
      ));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    try {
      setSaving(true);
      clearMessages();
      await deleteAvailabilitySlot(userId, slotId);
      setSuccess(t('Time slot removed.', 'Vapaa aika poistettu.'));
      if (editor?.mode === 'edit' && editor.slotId === slotId) {
        setEditor(null);
      }
      await refreshSlots();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not remove this time right now. Please try again. ', 'Aikaa ei voitu poistaa juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setSaving(false);
    }
  }

  function renderEditorRow() {
    if (!editor) {
      return null;
    }

    const minStartDate = toDateInputValue(new Date());

    return (
      <div className="rounded-2xl border border-[#ffcfac] bg-[#fff8f3] p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.3fr)_auto] xl:items-end">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t('Start Date', 'Alkamispäivä')}
              </span>
              <input
                type="date"
                value={editor.startDate}
                min={minStartDate}
                onChange={(event) => updateEditorField('startDate', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t('End Date', 'Päättymispäivä')}
              </span>
              <input
                type="date"
                value={editor.endDate}
                min={editor.startDate}
                onChange={(event) => updateEditorField('endDate', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t('Start Time', 'Alkamisaika')}
              </span>
              <input
                type="time"
                value={editor.startTime}
                onChange={(event) => updateEditorField('startTime', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t('End Time', 'Päättymisaika')}
              </span>
              <input
                type="time"
                value={editor.endTime}
                onChange={(event) => updateEditorField('endTime', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={closeEditor}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-[#0f2640] hover:bg-gray-50 disabled:opacity-50"
            >
              {t('Cancel', 'Peruuta')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveEditor}
              className="rounded-full bg-[#ff7a2d] px-4 py-2 text-sm font-medium text-white hover:bg-[#e66a1f] disabled:opacity-50"
            >
              {saving ? t('Saving...', 'Tallennetaan...') : editor.mode === 'edit' ? t('Save', 'Tallenna') : t('Add', 'Lisää')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#0f2640]">{t('Times I can help', 'Ajat, jolloin voin auttaa')}</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            {t('Add the dates and times when you can care for pets.', 'Lisää päivät ja kellonajat, jolloin voit hoitaa lemmikkejä.')}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-[#d9e6f2] bg-[#f8fbff] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#0f2640]">{t('Your saved times', 'Tallentamasi ajat')}</p>
            <p className="mt-1 text-sm text-[#6b7280]">
              {t('Pet owners can use these times when they ask for help.', 'Lemmikinomistajat näkevät nämä ajat pyytäessään apua.')}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => openCreateEditor()}
            className="rounded-full bg-[#ff7a2d] px-4 py-2 text-sm font-medium text-white hover:bg-[#e66a1f] disabled:opacity-50"
          >
            {t('Add time', 'Lisää aika')}
          </button>
        </div>

        <div className="hidden rounded-xl border border-[#d9e6f2] bg-white px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#6b7280] xl:grid xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.3fr)_auto]">
          <span>{t('Dates', 'Päivämäärät')}</span>
          <span>{t('Times', 'Kellonajat')}</span>
          <span className="text-right">{t('Actions', 'Toiminnot')}</span>
        </div>

        <div className="mt-3 space-y-3">
          {editor?.mode === 'create' && renderEditorRow()}

          {loading ? (
            <div className="rounded-2xl border border-dashed border-[#c9d8e6] bg-white px-4 py-8 text-center text-sm text-[#6b7280]">
              {t('Loading time slots...', 'Ladataan vapaita aikoja...')}
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#c9d8e6] bg-white px-4 py-8 text-center text-sm text-[#6b7280]">
              {t('No times added yet. Add times you can help.', 'Et ole vielä lisännyt vapaita aikoja. Lisää ajat, jolloin voit auttaa.')}
            </div>
          ) : (
            slots.map((slot) => (
              <div key={slot.id}>
                {editor?.mode === 'edit' && editor.slotId === slot.id ? (
                  renderEditorRow()
                ) : (
                  <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.3fr)_auto] xl:items-center">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] xl:hidden">
                          {t('Dates', 'Päivämäärät')}
                        </p>
                        <p className="text-sm font-semibold text-[#0f2640]">{formatDateRange(slot)}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] xl:hidden">
                          {t('Times', 'Kellonajat')}
                        </p>
                        <p className="text-sm font-semibold text-[#23405f]">{formatTimeRange(slot)}</p>
                      </div>

                      <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => openEditEditor(slot)}
                          className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-[#0f2640] hover:bg-gray-50 disabled:opacity-50"
                        >
                          {t('Edit', 'Muokkaa')}
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {t('Delete', 'Poista')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
