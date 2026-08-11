'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CitySelect from '@/components/CitySelect';
import ProfileAvatar from '@/components/ProfileAvatar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getUserRequests,
  getSitterRequests,
  getDirectRequestsForSitter,
  getAllOpenRequests,
  createRequest,
  updateRequest,
  cancelRequest,
  deleteRequest,
  cancelAcceptedRequest,
  markAwaitingConfirmation,
  confirmCompletion,
  acceptApplication,
  acceptRequest,
  applyToRequest,
  calculateCreditsForRequestWindow,
  submitReview,
  withdrawApplication,
} from '@/lib/requestService';
import { getUserPets } from '@/lib/petService';
import { reportRequest } from '@/lib/moderationService';
import {
  MEET_AND_GREET_RECOMMENDATION,
  PLATFORM_ROLE_ACKNOWLEDGEMENT,
  PLATFORM_ROLE_NOTICE,
} from '@/lib/legalPolicy';
import { Request, CreateRequestData, CareType, RequestApplication } from '@/types/request';
import { Pet } from '@/types/pet';

type ExchangeTab = 'my-requests' | 'direct-requests' | 'community' | 'my-sits';
type RequestWizardStep = 1 | 2 | 3 | 4;
type ConfirmationDialog = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  requiresArrangementAcknowledgement?: boolean;
};

const OWNER_FREE_CANCELLATION_HOURS = 24;

const requestWizardSteps: Array<{ step: RequestWizardStep; label: string }> = [
  { step: 1, label: 'Your pet' },
  { step: 2, label: 'Dates & place' },
  { step: 3, label: 'Care details' },
  { step: 4, label: 'Review' },
];

const careTypeOptions: Array<{ value: CareType; label: string; description: string }> = [
  {
    value: 'overnight',
    label: 'Overnight',
    description: 'Care that includes an overnight stay.',
  },
  {
    value: 'daily-visit',
    label: 'Home visits',
    description: 'Short visits for feeding, play, cleaning, or check-ins.',
  },
  {
    value: 'walking',
    label: 'Dog walks',
    description: 'Walks and outdoor time for dogs.',
  },
  {
    value: 'boarding',
    label: 'Boarding',
    description: 'Pet care at the sitter\'s place, when agreed.',
  },
];

function resolveInitialTab(value: string | null): ExchangeTab {
  switch (value) {
    case 'direct-requests':
      return 'direct-requests';
    case 'community':
      return 'community';
    case 'my-sits':
      return 'my-sits';
    case 'my-requests':
    default:
      return 'my-requests';
  }
}

function parseFormDateTime(date: string, time: string): Date | null {
  if (!date.trim() || !time.trim()) {
    return null;
  }

  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRequestDuration(startAt: Date, endAt: Date, language: 'en' | 'fi'): string {
  const durationMs = endAt.getTime() - startAt.getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '';
  }

  const totalMinutes = Math.ceil(durationMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return language === 'fi' ? `${hours} t` : `${hours} hr`;
  }

  return language === 'fi' ? `${hours} t ${minutes} min` : `${hours} hr ${minutes} min`;
}

function formatRequestDateTime(date: Date, language: 'en' | 'fi'): string {
  const locale = language === 'fi' ? 'fi-FI' : 'en-GB';
  return `${date.toLocaleDateString(locale)} ${language === 'fi' ? 'klo' : 'at'} ${date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function isOwnerCreditError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return message.includes('request owner does not have enough credits');
}

function isInsideOwnerFreeCancellationWindow(startDate: Date): boolean {
  return startDate.getTime() - Date.now() <= OWNER_FREE_CANCELLATION_HOURS * 60 * 60 * 1000;
}

function getCancellationCreditNotice(
  request: Request,
  viewer: 'owner' | 'sitter',
  language: 'en' | 'fi'
): string {
  if (request.status !== 'cancelled') {
    return '';
  }

  if (request.cancellationCreditOutcome === 'sitter_paid') {
    if (viewer === 'owner') {
      return language === 'fi'
        ? 'Hoito peruutettiin alle 24 tuntia ennen alkamista. Varatut krediitit annettiin hoitajalle.'
        : 'Cancelled within 24 hours of the start time. The reserved credits were given to the sitter.';
    }
    return language === 'fi'
      ? 'Hoito peruutettiin alle 24 tuntia ennen alkamista. Varatut krediitit vapautettiin sinulle.'
      : 'Cancelled within 24 hours of the start time. The reserved credits were released to you.';
  }

  if (request.cancellationCreditOutcome === 'owner_refunded') {
    if (viewer === 'owner') {
      return language === 'fi'
        ? 'Varatut krediitit palautettiin sinulle.'
        : 'The reserved credits were returned to you.';
    }
    return language === 'fi'
      ? 'Varatut krediitit palautettiin lemmikin omistajalle.'
      : 'The reserved credits were returned to the pet owner.';
  }

  return '';
}

function RequestsPageContent() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const localizeRequestText = (value: string) => language === 'fi' ? ({
    'Your pet': 'Lemmikkisi', 'Dates & place': 'Ajankohta ja paikka', 'Care details': 'Hoidon tiedot',
    Review: 'Tarkistus', Overnight: 'Yöhoito', 'Care that includes an overnight stay.': 'Hoito, johon sisältyy yöpyminen.',
    'Home visits': 'Kotikäynnit', 'Short visits for feeding, play, cleaning, or check-ins.': 'Lyhyet käynnit ruokintaa, leikkiä, siivousta tai voinnin tarkistamista varten.',
    'Dog walks': 'Koiran ulkoilutus', 'Walks and outdoor time for dogs.': 'Koirien lenkitys ja ulkoilu.',
    Boarding: 'Hoito hoitajan luona', "Pet care at the sitter's place, when agreed.": 'Lemmikin hoito hoitajan luona erikseen sovittaessa.',
  }[value] || value) : value;
  const router = useRouter();
  const searchParams = useSearchParams();
  const wizardAdvanceLockRef = useRef(false);
  const wizardStepRef = useRef<RequestWizardStep>(1);
  const confirmationResolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const tabParam = searchParams.get('tab');
  const createParam = searchParams.get('create');
  const requestedSitterId = searchParams.get('sitterId');
  const requestedSitterName = searchParams.get('sitterName') || '';
  const highlightedRequestId = searchParams.get('requestId') || '';
  const showAllCommunityRequests = searchParams.get('view') === 'all';
  const [requests, setRequests] = useState<Request[]>([]);
  const [directRequests, setDirectRequests] = useState<Request[]>([]);
  const [communityRequests, setCommunityRequests] = useState<Request[]>([]);
  const [sitterJobs, setSitterJobs] = useState<Request[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ExchangeTab>(resolveInitialTab(tabParam));
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actioningRequestId, setActioningRequestId] = useState<string | null>(null);
  const [processingCommunityRequestId, setProcessingCommunityRequestId] = useState<string | null>(null);
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [applicationMessages, setApplicationMessages] = useState<Record<string, string>>({});
  const [cityFilter, setCityFilter] = useState('');
  const [reportingRequest, setReportingRequest] = useState<Request | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialog | null>(null);

  // Form fields
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [careType, setCareType] = useState<CareType>('daily-visit');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [feedingSchedule, setFeedingSchedule] = useState('');
  const [walkSchedule, setWalkSchedule] = useState('');
  const [medicationInstructions, setMedicationInstructions] = useState('');
  const [sleepInstructions, setSleepInstructions] = useState('');
  const [specialWarnings, setSpecialWarnings] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestWizardStep, setRequestWizardStep] = useState<RequestWizardStep>(1);
  const [careDetailsConfirmed, setCareDetailsConfirmed] = useState(false);
  const [reviewStepReady, setReviewStepReady] = useState(false);
  const [arrangementAcknowledged, setArrangementAcknowledged] = useState(false);
  const [confirmationAcknowledged, setConfirmationAcknowledged] = useState(false);

  const loadData = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!user) return;

    try {
      if (!options.silent) {
        setLoading(true);
        setError('');
      }
      const [userRequests, userPets, sitterRequests, directSitterRequests, openRequests] = await Promise.all([
        getUserRequests(user.uid),
        getUserPets(user.uid),
        getSitterRequests(user.uid),
        getDirectRequestsForSitter(user.uid),
        getAllOpenRequests(user.uid),
      ]);
      setRequests(userRequests);
      setPets(userPets);
      setSitterJobs(sitterRequests);
      setDirectRequests(directSitterRequests);
      setCommunityRequests(openRequests);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (!options.silent) {
        setError(t('We could not load your requests right now. Please try again. ', 'Hoitopyyntöjäsi ei voitu ladata juuri nyt. Yritä uudelleen. ') + message);
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [t, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user || showForm) {
      return;
    }

    const refreshQuietly = () => {
      void loadData({ silent: true });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshQuietly();
      }
    };

    window.addEventListener('focus', refreshQuietly);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const refreshIntervalId = window.setInterval(refreshQuietly, 60000);

    return () => {
      window.removeEventListener('focus', refreshQuietly);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(refreshIntervalId);
    };
  }, [loadData, showForm, user]);

  useEffect(() => {
    setActiveTab(resolveInitialTab(tabParam));
  }, [tabParam]);

  useEffect(() => {
    if (tabParam !== 'community' || !showAllCommunityRequests) {
      return;
    }

    setCityFilter('');
  }, [showAllCommunityRequests, tabParam]);

  useEffect(() => {
    if (createParam !== '1') {
      return;
    }

    setActiveTab('my-requests');
    setEditingRequest(null);
    setSelectedPetIds([]);
    setCareType('daily-visit');
    setStartDate('');
    setStartTime('09:00');
    setEndDate('');
    setEndTime('18:00');
    setLocation('');
    setNotes('');
    setFeedingSchedule('');
    setWalkSchedule('');
    setMedicationInstructions('');
    setSleepInstructions('');
    setSpecialWarnings('');
    setShowForm(true);
    setRequestWizardStep(1);
    wizardStepRef.current = 1;
    setCareDetailsConfirmed(false);
    setReviewStepReady(false);
    setArrangementAcknowledged(false);
  }, [createParam, requestedSitterId]);

  function selectTab(tab: ExchangeTab) {
    setActiveTab(tab);
    setShowForm(false);
    setEditingRequest(null);
    setError('');
    setSuccess('');
    router.push(`/exchange?tab=${tab}${tab === 'community' ? '&view=all' : ''}`, {
      scroll: false,
    });
  }

  function handleAddNew() {
    router.push('/exchange?tab=my-requests&create=1', { scroll: false });
    setActiveTab('my-requests');
    setEditingRequest(null);
    setSelectedPetIds([]);
    setCareType('daily-visit');
    setStartDate('');
    setStartTime('09:00');
    setEndDate('');
    setEndTime('18:00');
    setLocation('');
    setNotes('');
    setFeedingSchedule('');
    setWalkSchedule('');
    setMedicationInstructions('');
    setSleepInstructions('');
    setSpecialWarnings('');
    setRequestWizardStep(1);
    wizardStepRef.current = 1;
    setCareDetailsConfirmed(false);
    setReviewStepReady(false);
    setArrangementAcknowledged(false);
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function handleEdit(request: Request) {
    if (request.status !== 'open') {
      setError(t('You can only edit requests that are still open.', 'Voit muokata vain avoimia hoitopyyntöjä.'));
      return;
    }

    setActiveTab('my-requests');
    setEditingRequest(request);
    setSelectedPetIds(request.petIds);
    setCareType(request.careType);
    setStartDate(request.startDate.toISOString().split('T')[0]);
    setStartTime(request.startDate.toTimeString().slice(0, 5));
    setEndDate(request.endDate.toISOString().split('T')[0]);
    setEndTime(request.endDate.toTimeString().slice(0, 5));
    setLocation(request.location);
    setNotes(request.notes || '');
    setFeedingSchedule(request.feedingSchedule || '');
    setWalkSchedule(request.walkSchedule || '');
    setMedicationInstructions(request.medicationInstructions || '');
    setSleepInstructions(request.sleepInstructions || '');
    setSpecialWarnings(request.specialWarnings || '');
    setRequestWizardStep(1);
    wizardStepRef.current = 1;
    setCareDetailsConfirmed(false);
    setReviewStepReady(false);
    setArrangementAcknowledged(false);
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function handleCancel() {
    setShowForm(false);
    setEditingRequest(null);
    setError('');
    setSuccess('');
    if (createParam === '1') {
      router.replace('/exchange?tab=my-requests', { scroll: false });
    }
  }

  async function handleFinalSubmit() {
    if (!user) return;
    if (wizardStepRef.current !== 4 || requestWizardStep !== 4 || !reviewStepReady) {
      setError(t('Review your request before sending it.', 'Tarkista hoitopyyntö ennen lähettämistä.'));
      return;
    }
    if (!validateRequestBeforeSubmit()) {
      return;
    }
    if (!arrangementAcknowledged) {
      setError(t('Please confirm that you understand TassuKaveri is a connection platform before sending.', 'Vahvista ennen lähettämistä, että ymmärrät TassuKaverin olevan yhteydenpitoalusta.'));
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const parsedStartDate = parseFormDateTime(startDate, startTime);
      const parsedEndDate = parseFormDateTime(endDate, endTime);

      if (!parsedStartDate || !parsedEndDate) {
        throw new Error('Please choose a start and end date with times.');
      }

      const autoCalculatedCredits = calculateCreditsForRequestWindow(parsedStartDate, parsedEndDate);

      const requestData: CreateRequestData = {
        petIds: selectedPetIds,
        careType,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        location,
        creditsOffered: autoCalculatedCredits,
        audience: !editingRequest && requestedSitterId ? 'direct' : 'community',
        requestedSitterId: !editingRequest ? requestedSitterId || undefined : undefined,
        requestedSitterName: !editingRequest ? requestedSitterName || undefined : undefined,
        notes,
        feedingSchedule,
        walkSchedule,
        medicationInstructions,
        sleepInstructions,
        specialWarnings,
      };

      if (editingRequest) {
        await updateRequest(user.uid, editingRequest.id, requestData);
        setSuccess(t('Pet-care request updated.', 'Hoitopyyntö päivitetty.'));
      } else {
        await createRequest(user.uid, requestData);
        setSuccess(t('Pet-care request sent.', 'Hoitopyyntö lähetetty.'));
      }

      setShowForm(false);
      setEditingRequest(null);
      setActiveTab('my-requests');
      if (createParam === '1') {
        router.replace('/exchange?tab=my-requests', { scroll: false });
      }
      await loadData();
      setShowForm(false);
      setEditingRequest(null);
      setRequestWizardStep(1);
      wizardStepRef.current = 1;
      setReviewStepReady(false);
      setArrangementAcknowledged(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not save this request right now. Please check the fields and try again. ', 'Hoitopyyntöä ei voitu tallentaa. Tarkista tiedot ja yritä uudelleen. ') + message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRequest(request: Request) {
    if (!user) return;
    const confirmed = await requestConfirmation({
      title: t('Cancel request?', 'Peruutetaanko hoitopyyntö?'),
      message: t('Sitters will no longer see this pet-care request.', 'Hoitajat eivät enää näe tätä hoitopyyntöä.'),
      confirmLabel: t('Cancel request', 'Peruuta pyyntö'),
      tone: 'danger',
    });
    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await cancelRequest(user.uid, request.id);
      setSuccess(t('Pet-care request cancelled.', 'Hoitopyyntö peruutettu.'));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not cancel this request right now. Please try again. ', 'Hoitopyyntöä ei voitu peruuttaa juuri nyt. Yritä uudelleen. ') + message);
    }
  }

  async function handleDelete(request: Request) {
    if (!user) return;
    const confirmed = await requestConfirmation({
      title: t('Delete request?', 'Poistetaanko hoitopyyntö?'),
      message: t('This pet-care request will be permanently removed for both people.', 'Hoitopyyntö poistetaan pysyvästi molemmilta osapuolilta.'),
      confirmLabel: t('Delete request', 'Poista pyyntö'),
      tone: 'danger',
    });
    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await deleteRequest(user.uid, request.id);
      setSuccess(t('Pet-care request deleted.', 'Hoitopyyntö poistettu.'));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not delete this request right now. Please try again. ', 'Hoitopyyntöä ei voitu poistaa juuri nyt. Yritä uudelleen. ') + message);
    }
  }

  async function handleMarkAwaitingConfirmation(request: Request) {
    if (!user) return;
    const confirmed = await requestConfirmation({
      title: t('Mark care as finished?', 'Merkitäänkö hoito päättyneeksi?'),
      message: t('The owner will need to confirm before you receive the credits.', 'Omistajan on vahvistettava hoito ennen kuin saat krediitit.'),
      confirmLabel: t('Mark finished', 'Merkitse päättyneeksi'),
    });
    if (!confirmed) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await markAwaitingConfirmation(request.ownerId, request.id, user.uid);
      setSuccess(t('Marked as finished. Waiting for the owner to confirm.', 'Hoito merkitty päättyneeksi. Odotetaan omistajan vahvistusta.'));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not mark this care as finished. Please try again. ', 'Hoitoa ei voitu merkitä päättyneeksi. Yritä uudelleen. ') + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleConfirmCompletion(request: Request) {
    if (!user) return;
    const confirmed = await requestConfirmation({
      title: t('Confirm completed care?', 'Vahvistetaanko päättynyt hoito?'),
      message: t('The sitter will receive the reserved credits.', 'Hoitaja saa varatut krediitit.'),
      confirmLabel: t('Confirm care', 'Vahvista hoito'),
    });
    if (!confirmed) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await confirmCompletion(request.ownerId, request.id);
      setSuccess(t('Care confirmed. The sitter received the credits.', 'Hoito vahvistettu. Hoitaja sai krediitit.'));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not confirm this care right now. Please try again. ', 'Hoitoa ei voitu vahvistaa juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleCancelAcceptedRequest(request: Request) {
    if (!user) return;
    const actorIsOwner = user.uid === request.ownerId;
    const ownerLateCancellation = actorIsOwner && isInsideOwnerFreeCancellationWindow(request.startDate);
    const sitterLateCancellation = !actorIsOwner && isInsideOwnerFreeCancellationWindow(request.startDate);
    const confirmed = await requestConfirmation({
      title: t('Cancel this accepted care?', 'Peruutetaanko sovittu hoito?'),
      message: actorIsOwner
        ? ownerLateCancellation
          ? t('This care starts within 24 hours, so the reserved credits will be given to the sitter.', 'Hoito alkaa alle 24 tunnin kuluttua, joten varatut krediitit annetaan hoitajalle.')
          : t('The reserved credits will be returned to you.', 'Varatut krediitit palautetaan sinulle.')
        : sitterLateCancellation
          ? t('This care starts within 24 hours. Cancelling now may leave the pet owner without help, and the reserved credits will be returned to them.', 'Hoito alkaa alle 24 tunnin kuluttua. Peruuttaminen voi jättää lemmikin omistajan ilman apua, ja varatut krediitit palautetaan hänelle.')
          : t('The reserved credits will be returned to the pet owner.', 'Varatut krediitit palautetaan lemmikin omistajalle.'),
      confirmLabel: t('Cancel care', 'Peruuta hoito'),
      tone: 'danger',
    });
    if (!confirmed) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await cancelAcceptedRequest(request.ownerId, request.id, user.uid);
      setSuccess(
        actorIsOwner
          ? ownerLateCancellation
            ? t('Pet care cancelled. The reserved credits were released to the sitter.', 'Lemmikinhoito peruutettiin. Varatut krediitit vapautettiin hoitajalle.')
            : t('Pet care cancelled. The reserved credits were returned to you.', 'Lemmikinhoito peruutettiin. Varatut krediitit palautettiin sinulle.')
          : t('Pet care cancelled. The reserved credits were returned to the pet owner.', 'Lemmikinhoito peruutettiin. Varatut krediitit palautettiin lemmikin omistajalle.')
      );
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not cancel this pet care right now. Please try again. ', 'Lemmikinhoitoa ei voitu peruuttaa juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleAcceptApplicant(request: Request, application: RequestApplication) {
    if (!user) return;
    const confirmed = await requestConfirmation({
      title: t(`Choose ${application.sitterName}?`, `Valitaanko ${application.sitterName} hoitajaksi?`),
      message: t('Reserved credits will stay held until the care is finished or cancelled.', 'Varatut krediitit pidetään varauksessa, kunnes hoito päättyy tai peruutetaan.'),
      confirmLabel: t('Choose sitter', 'Valitse hoitaja'),
      requiresArrangementAcknowledgement: true,
    });
    if (!confirmed) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await acceptApplication(request.ownerId, request.id, application.sitterId);
      setSuccess(t(
        `Accepted ${application.sitterName}. Reserved credits stay held until the care is finished or cancelled.`,
        `${application.sitterName} valittiin hoitajaksi. Krediitit pysyvät varauksessa, kunnes hoito päättyy tai peruutetaan.`
      ));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not accept this sitter right now. Please try again. ', 'Hoitajaa ei voitu hyväksyä juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleSubmitReview(request: Request) {
    if (!user) return;

    const rating = reviewRatings[request.id] || 0;
    const comment = reviewComments[request.id] || '';

    if (rating < 1 || rating > 5) {
      setError(t('Please select a rating between 1 and 5.', 'Valitse arvosana 1–5.'));
      return;
    }

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await submitReview(request.ownerId, request.id, rating, comment);
      setSuccess(t('Review sent. Thank you for helping the community.', 'Arvostelu lähetetty. Kiitos, että autat yhteisöä.'));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not send your review right now. Please try again. ', 'Arvostelua ei voitu lähettää juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  function isAppliedByCurrentUser(request: Request): boolean {
    if (!user) return false;
    return Boolean(request.applications?.some((application) => application.sitterId === user.uid));
  }

  async function handleApply(request: Request) {
    if (!user) return;
    const confirmed = await requestConfirmation({
      title: t('Send offer?', 'Lähetetäänkö tarjous?'),
      message: t(
        `Offer to help with ${request.petNames.join(', ')} for ${request.creditsOffered} credits.`,
        `Tarjoa apuasi lemmikille ${request.petNames.join(', ')} ${request.creditsOffered} krediitillä.`
      ),
      confirmLabel: t('Send offer', 'Lähetä tarjous'),
      requiresArrangementAcknowledgement: true,
    });
    if (!confirmed) return;

    setProcessingCommunityRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await applyToRequest(
        request.ownerId,
        request.id,
        user.uid,
        applicationMessages[request.id] || ''
      );
      setSuccess(t(`Offer sent for ${request.petNames.join(', ')}.`, `Tarjous lähetettiin lemmikille ${request.petNames.join(', ')}.`));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not send your offer right now. Please try again. ', 'Tarjousta ei voitu lähettää juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setProcessingCommunityRequestId(null);
    }
  }

  async function handleAcceptDirectRequest(request: Request) {
    if (!user) return;
    const confirmed = await requestConfirmation({
      title: t('Accept direct request?', 'Hyväksytäänkö suora pyyntö?'),
      message: t(
        `Accept this direct pet-care request for ${request.petNames.join(', ')}.`,
        `Hyväksy suora hoitopyyntö lemmikille ${request.petNames.join(', ')}.`
      ),
      confirmLabel: t('Accept request', 'Hyväksy pyyntö'),
      requiresArrangementAcknowledgement: true,
    });
    if (!confirmed) return;

    setProcessingCommunityRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await acceptRequest(request.ownerId, request.id, user.uid);
      setSuccess(t(
        `Direct pet-care request accepted for ${request.petNames.join(', ')}.`,
        `Suora hoitopyyntö hyväksyttiin lemmikille ${request.petNames.join(', ')}.`
      ));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(
        isOwnerCreditError(err)
          ? t('The pet owner does not currently have enough credits reserved for this request. Ask them to add credits or send a shorter request.', 'Lemmikin omistajalla ei ole tällä hetkellä riittävästi krediittejä varattuna tähän pyyntöön. Pyydä häntä lisäämään krediittejä tai lähettämään lyhyempi pyyntö.')
          : t('We could not accept this direct request right now. Please try again. ', 'Suoraa pyyntöä ei voitu hyväksyä juuri nyt. Yritä uudelleen. ') + message
      );
    } finally {
      setProcessingCommunityRequestId(null);
    }
  }

  async function handleWithdraw(request: Request) {
    if (!user) return;
    const confirmed = await requestConfirmation({
      title: t('Withdraw offer?', 'Perutaanko tarjous?'),
      message: t('The owner will no longer see your offer for this request.', 'Omistaja ei enää näe tarjoustasi tähän pyyntöön.'),
      confirmLabel: t('Withdraw offer', 'Peru tarjous'),
      tone: 'danger',
    });
    if (!confirmed) return;

    setProcessingCommunityRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await withdrawApplication(request.ownerId, request.id, user.uid);
      setSuccess(t(`Offer withdrawn for ${request.petNames.join(', ')}.`, `Tarjous peruttiin lemmikille ${request.petNames.join(', ')}.`));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not withdraw your offer right now. Please try again. ', 'Tarjousta ei voitu perua juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setProcessingCommunityRequestId(null);
    }
  }

  function openReportModal(request: Request) {
    setReportingRequest(request);
    setReportReason('');
    setReportError('');
    setError('');
    setSuccess('');
  }

  function closeReportModal() {
    if (reportSubmitting) {
      return;
    }

    setReportingRequest(null);
    setReportReason('');
    setReportError('');
  }

  function requestConfirmation(dialog: ConfirmationDialog): Promise<boolean> {
    confirmationResolveRef.current?.(false);

    return new Promise((resolve) => {
      confirmationResolveRef.current = resolve;
      setConfirmationAcknowledged(false);
      setConfirmationDialog(dialog);
    });
  }

  function closeConfirmationDialog(confirmed: boolean) {
    const resolve = confirmationResolveRef.current;
    confirmationResolveRef.current = null;
    setConfirmationDialog(null);
    resolve?.(confirmed);
  }

  async function handleReportCommunityRequest() {
    if (!user || !reportingRequest) return;
    const reason = reportReason.trim();
    if (!reason) {
      setReportError('Tell us what feels wrong before sending the report.');
      return;
    }

    setReportSubmitting(true);
    setReportError('');
    setError('');
    setSuccess('');

    try {
      await reportRequest(user.uid, reportingRequest.ownerId, reportingRequest.id, reason);
      setSuccess(t('Request reported. An admin will review it.', 'Pyynnöstä on ilmoitettu. Ylläpito tarkistaa sen.'));
      setReportingRequest(null);
      setReportReason('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setReportError('We could not send this report right now. Please try again. ' + message);
    } finally {
      setReportSubmitting(false);
    }
  }

  function togglePetSelection(petId: string) {
    setSelectedPetIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
    );
  }

  function hasCareDetails(): boolean {
    return [
      notes,
      feedingSchedule,
      walkSchedule,
      medicationInstructions,
      sleepInstructions,
      specialWarnings,
    ].some((value) => value.trim().length > 0);
  }

  function validateCurrentWizardStep(): boolean {
    setError('');

    if (requestWizardStep === 1) {
      if (pets.length === 0) {
        setError(t('Add your first pet before you ask for care.', 'Lisää ensimmäinen lemmikkisi ennen hoitopyynnön tekemistä.'));
        return false;
      }
      if (selectedPetIds.length === 0) {
        setError(t('Choose at least one pet that needs care.', 'Valitse vähintään yksi hoitoa tarvitseva lemmikki.'));
        return false;
      }
    }

    if (requestWizardStep === 2) {
      const parsedStartDate = parseFormDateTime(startDate, startTime);
      const parsedEndDate = parseFormDateTime(endDate, endTime);

      if (!parsedStartDate || !parsedEndDate) {
        setError(t('Please choose a start and end date with times.', 'Valitse alkamis- ja päättymispäivä sekä kellonajat.'));
        return false;
      }
      if (parsedEndDate.getTime() <= parsedStartDate.getTime()) {
        setError(t('End date must be after start date', 'Päättymisajan on oltava alkamisajan jälkeen'));
        return false;
      }
      if (!location.trim()) {
        setError(t('Select the city where the care is needed.', 'Valitse kaupunki, jossa hoitoa tarvitaan.'));
        return false;
      }
    }

    if (requestWizardStep === 3) {
      if (!hasCareDetails() && !careDetailsConfirmed) {
        setError(t('Add a short care note, or confirm that no extra care notes are needed.', 'Lisää lyhyt hoito-ohje tai vahvista, ettei lisäohjeita tarvita.'));
        return false;
      }
    }

    return true;
  }

  function validateRequestBeforeSubmit(): boolean {
    if (selectedPetIds.length === 0) {
      setError(t('Choose at least one pet that needs care.', 'Valitse vähintään yksi hoitoa tarvitseva lemmikki.'));
      wizardStepRef.current = 1;
      setRequestWizardStep(1);
      setReviewStepReady(false);
      return false;
    }

    const parsedStartDate = parseFormDateTime(startDate, startTime);
    const parsedEndDate = parseFormDateTime(endDate, endTime);
    if (!parsedStartDate || !parsedEndDate || parsedEndDate.getTime() <= parsedStartDate.getTime() || !location.trim()) {
      setError(t('Check the dates, times, and city before sending.', 'Tarkista päivämäärät, kellonajat ja kaupunki ennen lähettämistä.'));
      wizardStepRef.current = 2;
      setRequestWizardStep(2);
      setReviewStepReady(false);
      return false;
    }

    if (!hasCareDetails() && !careDetailsConfirmed) {
      setError(t('Add a short care note, or confirm that no extra care notes are needed.', 'Lisää lyhyt hoito-ohje tai vahvista, ettei lisäohjeita tarvita.'));
      wizardStepRef.current = 3;
      setRequestWizardStep(3);
      setReviewStepReady(false);
      return false;
    }

    return true;
  }

  function goToNextWizardStep() {
    if (wizardAdvanceLockRef.current) {
      return;
    }
    const currentStep = wizardStepRef.current;
    if (currentStep !== requestWizardStep) {
      return;
    }
    if (!validateCurrentWizardStep()) {
      return;
    }

    wizardAdvanceLockRef.current = true;
    const nextStep = Math.min(currentStep + 1, 4) as RequestWizardStep;
    wizardStepRef.current = nextStep;
    setRequestWizardStep(nextStep);
    setReviewStepReady(false);
    if (nextStep === 4) {
      setTimeout(() => {
        if (wizardStepRef.current === 4) {
          setReviewStepReady(true);
        }
      }, 700);
    }
    setTimeout(() => {
      wizardAdvanceLockRef.current = false;
    }, 300);
  }

  function goToPreviousWizardStep() {
    setError('');
    wizardAdvanceLockRef.current = false;
    const previousStep = Math.max(wizardStepRef.current - 1, 1) as RequestWizardStep;
    wizardStepRef.current = previousStep;
    setRequestWizardStep(previousStep);
    setReviewStepReady(false);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'open':
        return 'text-blue-600 bg-blue-50';
      case 'accepted':
        return 'text-green-600 bg-green-50';
      case 'awaiting_confirmation':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-gray-600 bg-gray-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'open':
        return t('Open', 'Avoin');
      case 'accepted':
        return t('Accepted', 'Hyväksytty');
      case 'awaiting_confirmation':
        return t('Waiting for owner', 'Odottaa omistajan vahvistusta');
      case 'completed':
        return t('Completed', 'Valmis');
      case 'cancelled':
        return t('Cancelled', 'Peruutettu');
      default:
        return status;
    }
  }

  function getRequestStatusText(request: Request) {
    if (request.status === 'cancelled') {
      if (request.cancelledBy === 'owner') {
        return t('Cancelled by pet owner', 'Lemmikin omistaja peruutti');
      }
      if (request.cancelledBy === 'sitter') {
        return t('Cancelled by sitter', 'Hoitaja peruutti');
      }
    }

    return getStatusText(request.status);
  }

  function getCareTypeLabel(careType: string): string {
    const labels: Record<string, string> = {
      'daily-visit': t('Visit at home', 'Kotikäynti'),
      overnight: t('Overnight care', 'Yöhoito'),
      boarding: t('Boarding', 'Hoito hoitajan luona'),
      walking: t('Dog walk', 'Koiran ulkoilutus'),
    };
    return labels[careType] || careType;
  }

  function handleBrowseAllCommunityRequests() {
    setCityFilter('');
    router.push('/exchange?tab=community&view=all');
    void loadData();
  }

  const selectedCommunityRequest = highlightedRequestId
    ? communityRequests.find((request) => request.id === highlightedRequestId)
    : undefined;

  const filteredCommunityRequests = communityRequests.filter((request) => {
    const cityMatches =
      cityFilter.trim() === '' ||
      request.location.toLowerCase().includes(cityFilter.trim().toLowerCase());
    if (!cityMatches) {
      return false;
    }

    return true;
  });

  const visibleCommunityRequests = selectedCommunityRequest
    ? [selectedCommunityRequest]
    : filteredCommunityRequests;

  useEffect(() => {
    if (activeTab !== 'community' || !highlightedRequestId || loading) {
      return;
    }

    const target = document.getElementById(`request-${highlightedRequestId}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeTab, highlightedRequestId, loading, visibleCommunityRequests.length]);

  const formStartAt = parseFormDateTime(startDate, startTime);
  const formEndAt = parseFormDateTime(endDate, endTime);
  const hasValidRequestWindow =
    Boolean(formStartAt) &&
    Boolean(formEndAt) &&
    formEndAt!.getTime() > formStartAt!.getTime();
  const autoCalculatedCredits = hasValidRequestWindow
    ? calculateCreditsForRequestWindow(formStartAt!, formEndAt!)
    : 0;
  const requestDurationLabel = hasValidRequestWindow
    ? formatRequestDuration(formStartAt!, formEndAt!, language)
    : '';
  const selectedPets = pets.filter((pet) => selectedPetIds.includes(pet.id));
  const selectedPetNames = selectedPets.map((pet) => pet.name);
  const selectedPetLabel =
    selectedPetNames.length > 0 ? selectedPetNames.join(', ') : t('your pet', 'lemmikkisi');
  const requestFormTitle =
    !editingRequest && requestedSitterName
      ? t(`Ask ${requestedSitterName} to care for ${selectedPetLabel}`, `Pyydä hoitajaa ${requestedSitterName} hoitamaan lemmikkiä ${selectedPetLabel}`)
      : editingRequest
        ? t('Edit pet-care request', 'Muokkaa hoitopyyntöä')
        : t('Ask for pet care', 'Pyydä lemmikinhoitoa');
  const selectedCareTypeLabel = getCareTypeLabel(careType);
  const requestDateSummary =
    hasValidRequestWindow && formStartAt && formEndAt
      ? `${formStartAt.toLocaleDateString()} - ${formEndAt.toLocaleDateString()}`
      : t('Dates not selected', 'Ajankohtaa ei ole valittu');
  const showRequestWizard = activeTab === 'my-requests' && showForm && !success;

  return (
    <ProtectedRoute>
      <div
        className={
          showRequestWizard
            ? 'min-h-[calc(100vh-72px)] bg-[#f4eee5] px-4 py-6 sm:px-6 lg:px-8'
            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'
        }
      >
        {!showRequestWizard && (
        <div className="rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(135deg,#fff7ef_0%,#ffffff_42%,#eef5ff_100%)] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#ff7a2d]">
                {t('Exchange', 'Hoitovaihto')}
              </p>
              <h1 className="mt-3 text-3xl font-bold text-[#0f2640] sm:text-4xl">
                {t('Ask for pet care or offer to help', 'Pyydä lemmikinhoitoa tai tarjoa apuasi')}
              </h1>
              <p className="mt-3 max-w-3xl text-[#516173]">
                {t('Keep your pet-care requests, direct invites, and sitter jobs in one place.', 'Hallitse omia hoitopyyntöjäsi, suoria pyyntöjä ja hoitotehtäviäsi yhdessä paikassa.')}
              </p>
            </div>

            {!showForm && activeTab === 'my-requests' && (
              <button
                onClick={handleAddNew}
                className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
              >
                {t('Ask for pet care', 'Pyydä lemmikinhoitoa')}
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">{t('My pet-care requests', 'Omat hoitopyyntöni')}</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{requests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">{t('Direct asks', 'Suorat pyynnöt')}</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{directRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">{t('Requests to help', 'Avoimet hoitopyynnöt')}</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{communityRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">{t('Care I give', 'Antamani hoito')}</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{sitterJobs.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">{t('Pets added', 'Lisätyt lemmikit')}</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{pets.length}</p>
            </div>
          </div>
        </div>
        )}

        {!showRequestWizard && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => selectTab('my-requests')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'my-requests'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            {t('My requests', 'Omat pyynnöt')}
          </button>
          <button
            onClick={() => selectTab('direct-requests')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'direct-requests'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            {t('Direct asks', 'Suorat pyynnöt')}
          </button>
          <button
            onClick={() => selectTab('community')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'community'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            {t('Requests to help', 'Avoimet hoitopyynnöt')}
          </button>
          <button
            onClick={() => selectTab('my-sits')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'my-sits'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            {t('Care I give', 'Antamani hoito')}
          </button>
        </div>
        )}

        {error && (
          <div
            className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mt-6 mb-4 ${
              showRequestWizard ? 'mx-auto max-w-[1050px]' : ''
            }`}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className={`bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 ${
              showRequestWizard ? 'mx-auto max-w-[1050px]' : ''
            }`}
          >
            {success}
          </div>
        )}

        {activeTab === 'my-requests' && pets.length === 0 && !loading && !showForm && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
            {t('Add your pet before you ask for pet care.', 'Lisää lemmikkisi ennen hoitopyynnön tekemistä.')}
          </div>
        )}

        {showRequestWizard ? (
          <section className="mx-auto max-w-[1050px]">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#425266] hover:text-[#0f2640] disabled:opacity-50"
            >
              <span aria-hidden="true">&larr;</span>
              {t('Cancel request', 'Peruuta pyyntö')}
            </button>

            <h2 className="mt-6 text-3xl font-bold tracking-[-0.03em] text-[#0f2640]">
              {requestFormTitle}
            </h2>

            <div className="mt-7 grid gap-3 sm:grid-cols-4">
              {requestWizardSteps.map((item) => {
                const isActive = requestWizardStep === item.step;
                const isComplete = requestWizardStep > item.step;

                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      if (item.step < requestWizardStep) {
                        wizardStepRef.current = item.step;
                        setRequestWizardStep(item.step);
                        setReviewStepReady(false);
                      }
                    }}
                    className="flex items-center gap-3 text-left"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isActive
                          ? 'bg-[#e96b2c] text-white'
                          : isComplete
                            ? 'bg-[#2f7d62] text-white'
                            : 'bg-white text-[#8a97a3]'
                      }`}
                    >
                      {item.step}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        isActive ? 'text-[#0f2640]' : 'text-[#7a8794]'
                      }`}
                    >
                      {localizeRequestText(item.label)}
                    </span>
                    <span className="hidden h-px flex-1 bg-[#ded6ca] sm:block" />
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={(event) => event.preventDefault()}
              className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,600px)_400px]"
            >
              <div className="rounded-[18px] border border-[#ded3c2] bg-white p-7 shadow-sm">
                {requestWizardStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold tracking-[-0.02em] text-[#0f2640]">
                        {t('Who needs care, and what kind?', 'Kuka tarvitsee hoitoa ja millaista?')}
                      </h3>
                      <p className="mt-2 text-sm text-[#516173]">
                        {t('Choose your pet and the type of care you are looking for.', 'Valitse lemmikki ja tarvitsemasi hoitomuoto.')}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a8794]">
                        {t('Your pet', 'Lemmikkisi')}
                      </p>
                      {pets.length > 0 ? (
                        <div className="space-y-3">
                          {pets.map((pet) => {
                            const selected = selectedPetIds.includes(pet.id);

                            return (
                              <label
                                key={pet.id}
                                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                                  selected
                                    ? 'border-[#e96b2c] bg-[#fff4ec]'
                                    : 'border-[#e3d7c7] bg-white hover:bg-[#fffaf6]'
                                }`}
                              >
                                <span className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => togglePetSelection(pet.id)}
                                    className="sr-only"
                                  />
                                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-bold uppercase text-[#e96b2c] shadow-sm">
                                    {pet.type.slice(0, 1)}
                                  </span>
                                  <span>
                                    <span className="block font-semibold text-[#0f2640]">
                                      {pet.name}
                                    </span>
                                    <span className="text-sm capitalize text-[#6b7280]">
                                      {pet.type}
                                      {pet.breed ? ` - ${pet.breed}` : ''}
                                      {pet.age ? ` - ${pet.age} yrs` : ''}
                                    </span>
                                  </span>
                                </span>
                                {selected && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e96b2c] text-xs font-bold text-white">
                                    &#10003;
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                          <p className="text-sm font-semibold text-blue-900">
                            {t('Add your first pet before you ask for care.', 'Lisää ensimmäinen lemmikkisi ennen hoitopyynnön tekemistä.')}
                          </p>
                          <button
                            type="button"
                            onClick={() => router.push('/pets')}
                            className="mt-3 rounded-full bg-[#ff7a2d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e66a1f]"
                          >
                            {t('Add your first pet', 'Lisää ensimmäinen lemmikkisi')}
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a8794]">
                        {t('Type of care', 'Hoitomuoto')}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-4">
                        {careTypeOptions.map((option) => {
                          const selected = careType === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setCareType(option.value)}
                              className={`rounded-xl border px-4 py-3 text-center text-sm font-bold transition-colors ${
                                selected
                                  ? 'border-[#e96b2c] bg-[#e96b2c] text-white'
                                  : 'border-[#e3d7c7] bg-white text-[#0f2640] hover:bg-[#fffaf6]'
                              }`}
                            >
                              {localizeRequestText(option.label)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {requestWizardStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-bold text-[#0f2640]">{t('When and where?', 'Milloin ja missä?')}</h3>
                      <p className="mt-2 text-sm text-[#516173]">
                        {t('Pick the dates, times, and city where the care is needed.', 'Valitse hoidon päivämäärät, kellonajat ja paikkakunta.')}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                          {t('Start date', 'Alkamispäivä')}
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                          className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                          {t('Start time', 'Alkamisaika')}
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          required
                          className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                          {t('End date', 'Päättymispäivä')}
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          required
                          className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                          {t('End time', 'Päättymisaika')}
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          required
                          className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                        {t('Location', 'Sijainti')}
                      </label>
                      <CitySelect
                        value={location}
                        onChange={setLocation}
                        required
                        className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                      />
                    </div>

                    <div className="rounded-2xl bg-[#fff1e7] p-4 text-sm text-[#7c3b19]">
                      {hasValidRequestWindow ? (
                        <span>
                          {t(
                            `${requestDurationLabel} = ${autoCalculatedCredits} credits, reserved until the care is finished.`,
                            `${requestDurationLabel} = ${autoCalculatedCredits} krediittiä, jotka varataan hoidon päättymiseen asti.`
                          )}
                        </span>
                      ) : (
                        <span>{t('Select valid start and end times to calculate credits.', 'Valitse kelvolliset alkamis- ja päättymisajat krediittien laskemista varten.')}</span>
                      )}
                    </div>
                  </div>
                )}

                {requestWizardStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-bold text-[#0f2640]">
                        Care notes for {selectedPetLabel}
                      </h3>
                      <p className="mt-2 text-sm text-[#516173]">
                        {t('Add only what the sitter needs to know. These details can be short.', 'Kerro vain hoidon kannalta tarpeelliset asiat. Lyhyet tiedot riittävät.')}
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                        {t('Notes for the sitter', 'Lisätiedot hoitajalle')}
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          setCareDetailsConfirmed(false);
                        }}
                        rows={3}
                        className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                        placeholder={t('Feeding, walking, medicine, behavior, or anything important.', 'Ruokailu, ulkoilu, lääkitys, käytös tai muu tärkeä tieto.')}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                          {t('Feeding', 'Ruokinta')}
                        </label>
                        <textarea
                          value={feedingSchedule}
                          onChange={(e) => {
                            setFeedingSchedule(e.target.value);
                            setCareDetailsConfirmed(false);
                          }}
                          rows={2}
                          className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                          placeholder={t('Times and food portions', 'Ruokailuajat ja annoskoot')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                          {t('Walks', 'Ulkoilu')}
                        </label>
                        <textarea
                          value={walkSchedule}
                          onChange={(e) => {
                            setWalkSchedule(e.target.value);
                            setCareDetailsConfirmed(false);
                          }}
                          rows={2}
                          className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                          placeholder={t('Walk times and duration', 'Ulkoiluajat ja lenkkien kesto')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                          {t('Medicine', 'Lääkitys')}
                        </label>
                        <textarea
                          value={medicationInstructions}
                          onChange={(e) => {
                            setMedicationInstructions(e.target.value);
                            setCareDetailsConfirmed(false);
                          }}
                          rows={2}
                          className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                          placeholder={t('Medicine dose and timing', 'Lääkeannos ja ajankohta')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                          {t('Sleep', 'Nukkuminen')}
                        </label>
                        <textarea
                          value={sleepInstructions}
                          onChange={(e) => {
                            setSleepInstructions(e.target.value);
                            setCareDetailsConfirmed(false);
                          }}
                          rows={2}
                          className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                          placeholder={t('Where and how the pet should sleep', 'Missä ja miten lemmikki nukkuu')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#0f2640]">
                        {t('Important warnings', 'Tärkeät huomioitavat asiat')}
                      </label>
                      <textarea
                        value={specialWarnings}
                        onChange={(e) => {
                          setSpecialWarnings(e.target.value);
                          setCareDetailsConfirmed(false);
                        }}
                        rows={2}
                        className="w-full rounded-xl border border-[#d8cbbb] px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                        placeholder={t('Anything the sitter must avoid or watch closely', 'Asiat, joita hoitajan pitää välttää tai tarkkailla erityisesti')}
                      />
                    </div>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition-colors ${
                        careDetailsConfirmed
                          ? 'border-[#9cc9b2] bg-[#e8f3ec] text-[#245d45]'
                          : 'border-[#e3d7c7] bg-[#fcfbf8] text-[#516173]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={careDetailsConfirmed}
                        onChange={(e) => setCareDetailsConfirmed(e.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        <span className="block font-semibold text-[#0f2640]">
                          {t('No extra care notes needed', 'Erillisiä hoito-ohjeita ei tarvita')}
                        </span>
                        <span className="mt-1 block">
                          {t(
                            'Choose this only if the sitter does not need feeding, walking, medicine, sleep, or warning details yet.',
                            'Valitse tämä vain, jos hoitaja ei vielä tarvitse ruokintaan, ulkoiluun, lääkitykseen, nukkumiseen tai varoituksiin liittyviä tietoja.'
                          )}
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {requestWizardStep === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-bold text-[#0f2640]">{t('Review your request', 'Tarkista hoitopyyntö')}</h3>
                      <p className="mt-2 text-sm text-[#516173]">
                        {t('Check the details, then send it.', 'Tarkista tiedot ja lähetä pyyntö.')}
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[#e3d7c7]">
                      {[
                        [t('Pet', 'Lemmikki'), selectedPetLabel],
                        [t('Care type', 'Hoitomuoto'), selectedCareTypeLabel],
                        [t('Dates', 'Ajankohta'), `${requestDateSummary} - ${requestDurationLabel || t('Duration not set', 'Kestoa ei ole asetettu')}`],
                        [t('Where', 'Paikka'), location || t('Location not selected', 'Sijaintia ei ole valittu')],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-4 border-b border-[#eee4d8] px-4 py-3 last:border-b-0"
                        >
                          <span className="text-sm font-medium text-[#7a8794]">{label}</span>
                          <span className="text-right text-sm font-semibold text-[#0f2640]">
                            {value}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-4 bg-[#fff1e7] px-4 py-3">
                        <span className="text-sm font-bold text-[#7c3b19]">{t('Credits reserved', 'Varatut krediitit')}</span>
                        <span className="text-sm font-bold text-[#d96522]">
                          {hasValidRequestWindow ? t(`${autoCalculatedCredits} credits`, `${autoCalculatedCredits} krediittiä`) : '--'}
                        </span>
                      </div>
                    </div>

                    {(notes || feedingSchedule || walkSchedule || medicationInstructions || sleepInstructions || specialWarnings) && (
                      <div className="rounded-2xl border border-[#e3d7c7] bg-[#fcfbf8] p-4">
                        <p className="text-sm font-bold text-[#0f2640]">{t('Care notes included', 'Hoito-ohjeet lisätty')}</p>
                        <p className="mt-1 text-sm text-[#6b7280]">
                          {t('The sitter will see your notes after you send this request.', 'Hoitaja näkee ohjeesi, kun olet lähettänyt pyynnön.')}
                        </p>
                      </div>
                    )}

                    <div className="rounded-2xl border border-[#d8cbbb] bg-[#fcfbf8] p-4 text-sm text-[#516173]">
                      <p className="font-bold text-[#0f2640]">{t('Before confirming', 'Ennen vahvistamista')}</p>
                      <p className="mt-2 leading-6">{t(PLATFORM_ROLE_NOTICE, 'TassuKaveri auttaa lemmikin omistajia ja hoitajia löytämään toisensa. Hoidosta sovitaan suoraan käyttäjien kesken. Keskustelkaa ennen vahvistamista lemmikin tarpeista, käyttäytymisestä, lääkityksestä, hätäyhteystiedoista, kotiin pääsystä, krediiteistä, vakuutuksista ja muista hoitoehdoista.')}</p>
                      <p className="mt-2 leading-6">{t(MEET_AND_GREET_RECOMMENDATION, 'Turvallisuuden ja lemmikin hyvinvoinnin vuoksi suosittelemme tutustumistapaamista ennen ensimmäisen hoidon vahvistamista. Tämä on suositus, ei TassuKaverin antama takuu.')}</p>
                      <label className="mt-4 flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={arrangementAcknowledged}
                          onChange={(event) => setArrangementAcknowledged(event.target.checked)}
                          className="mt-1 h-4 w-4"
                        />
                        <span className="font-semibold text-[#0f2640]">
                          {t(PLATFORM_ROLE_ACKNOWLEDGEMENT, 'Ymmärrän, että TassuKaveri on yhteydenpitoalusta ja että lemmikin omistaja ja hoitaja sopivat hoidosta suoraan keskenään.')}
                        </span>
                      </label>
                    </div>

                    <div className="rounded-2xl bg-[#e8f3ec] p-4 text-sm text-[#245d45]">
                      {t('Your credits are reserved when you send this request, and released after you confirm the care is finished.', 'Krediitit varataan, kun lähetät pyynnön, ja vapautetaan hoitajalle, kun vahvistat hoidon päättyneeksi.')}
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={requestWizardStep === 1 ? handleCancel : goToPreviousWizardStep}
                    disabled={saving}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-[#0f2640] hover:bg-[#f7fafc] disabled:opacity-50"
                  >
                    {requestWizardStep === 1 ? t('Cancel', 'Peruuta') : t('Back', 'Takaisin')}
                  </button>

                  {requestWizardStep < 4 ? (
                    <button
                      type="button"
                      onClick={goToNextWizardStep}
                      disabled={saving || pets.length === 0}
                      className="rounded-full bg-[#ff7a2d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
                    >
                      {t('Continue', 'Jatka')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      disabled={saving || pets.length === 0 || !reviewStepReady || !arrangementAcknowledged}
                      className="rounded-full bg-[#ff7a2d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
                    >
                      {saving
                        ? t('Saving...', 'Tallennetaan...')
                        : !reviewStepReady
                          ? t('Review first', 'Tarkista ensin')
                          : editingRequest
                            ? t('Update request', 'Päivitä pyyntö')
                            : t('Ask for pet care', 'Pyydä lemmikinhoitoa')}
                    </button>
                  )}
                </div>
              </div>

              <aside className="rounded-[18px] border border-[#ded3c2] bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:self-start">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8794]">
                  {requestedSitterName ? t('Your sitter', 'Valitsemasi hoitaja') : t('Request summary', 'Pyynnön yhteenveto')}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1e7] text-lg font-bold text-[#d96522]">
                    {(requestedSitterName || 'TK').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[#0f2640]">
                      {requestedSitterName || t('Community request', 'Yhteisölle näkyvä pyyntö')}
                    </p>
                    <p className="text-sm text-[#6b7280]">
                      {requestedSitterName ? t('Selected sitter', 'Valittu hoitaja') : t('Visible to available sitters', 'Näkyy vapaana oleville hoitajille')}
                    </p>
                  </div>
                </div>

                {requestedSitterName && (
                  <div className="mt-4 inline-flex rounded-full bg-[#e8f3ec] px-3 py-2 text-xs font-bold text-[#245d45]">
                    {t('Direct request', 'Suora pyyntö')}
                  </div>
                )}

                <div className="mt-5 border-t border-[#eee4d8] pt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#516173]">
                      {requestDurationLabel || t('Duration', 'Kesto')}
                    </span>
                    <span className="font-bold text-[#0f2640]">
                      {hasValidRequestWindow ? autoCalculatedCredits : '--'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-[#0f2640]">{t('Total reserved', 'Varattu yhteensä')}</span>
                    <span className="text-2xl font-bold text-[#ff7a2d]">
                      {hasValidRequestWindow ? autoCalculatedCredits : '--'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#6b7280]">
                    {t('No money changes hands. Credits are only released after the owner confirms the care is finished.', 'Rahaa ei siirry osapuolten välillä. Krediitit vapautetaan vasta, kun omistaja vahvistaa hoidon päättyneeksi.')}
                  </p>
                </div>
              </aside>
            </form>
          </section>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">{t('Loading requests...', 'Ladataan hoitopyyntöjä...')}</p>
          </div>
        ) : (
          <>
            {activeTab === 'my-requests' && (
              <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#0f2640] mb-4">{t('My pet-care requests', 'Omat hoitopyyntöni')}</h2>
              {requests.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-[#6b7280]">
                    {t('You have not asked for pet care yet.', 'Et ole vielä tehnyt hoitopyyntöjä.')}{' '}
                    {pets.length > 0
                      ? t('Use "Ask for pet care" to start.', 'Aloita valitsemalla ”Pyydä lemmikinhoitoa”.')
                      : t('Add your first pet first.', 'Lisää ensin ensimmäinen lemmikkisi.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-[#0f2640] mb-1">
                            {request.petNames.join(', ')}
                          </h3>
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {getRequestStatusText(request)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#ff7a2d]">{t(`${request.creditsOffered} credits`, `${request.creditsOffered} krediittiä`)}</p>
                          {request.status === 'accepted' && (
                            <p className="text-xs text-[#6b7280]">{t('Reserved until care is finished or cancelled', 'Varattu, kunnes hoito päättyy tai peruutetaan')}</p>
                          )}
                          {request.status === 'awaiting_confirmation' && (
                            <p className="text-xs text-[#6b7280]">{t('Reserved until you confirm the care is finished', 'Varattu, kunnes vahvistat hoidon päättyneeksi')}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-[#6b7280]">{t('Care type:', 'Hoitomuoto:')}</p>
                          <p className="text-[#0f2640] font-medium">
                            {getCareTypeLabel(request.careType)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">{t('Location:', 'Sijainti:')}</p>
                          <p className="text-[#0f2640] font-medium">{request.location}</p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">{t('Starts:', 'Alkaa:')}</p>
                          <p className="text-[#0f2640] font-medium">
                            {formatRequestDateTime(request.startDate, language)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">{t('Ends:', 'Päättyy:')}</p>
                          <p className="text-[#0f2640] font-medium">
                            {formatRequestDateTime(request.endDate, language)}
                          </p>
                        </div>
                      </div>

                      {request.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-[#6b7280]">{t('Notes:', 'Lisätiedot:')}</p>
                          <p className="text-sm text-[#0f2640]">{request.notes}</p>
                        </div>
                      )}

                      {(request.feedingSchedule ||
                        request.walkSchedule ||
                        request.medicationInstructions ||
                        request.sleepInstructions ||
                        request.specialWarnings) && (
                        <div className="mb-4 p-3 border border-gray-200 rounded-lg text-sm space-y-1">
                          <p className="font-medium text-[#0f2640]">{t('Care Instructions', 'Hoito-ohjeet')}</p>
                          {request.feedingSchedule && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Feeding:', 'Ruokinta:')}</span>{' '}
                              {request.feedingSchedule}
                            </p>
                          )}
                          {request.walkSchedule && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Walks:', 'Ulkoilu:')}</span>{' '}
                              {request.walkSchedule}
                            </p>
                          )}
                          {request.medicationInstructions && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Medication:', 'Lääkitys:')}</span>{' '}
                              {request.medicationInstructions}
                            </p>
                          )}
                          {request.sleepInstructions && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Sleep:', 'Nukkuminen:')}</span>{' '}
                              {request.sleepInstructions}
                            </p>
                          )}
                          {request.specialWarnings && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Warnings:', 'Huomioitavaa:')}</span>{' '}
                              {request.specialWarnings}
                            </p>
                          )}
                        </div>
                      )}

                      {request.sitterName && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-[#6b7280]">{t('Sitter:', 'Hoitaja:')}</p>
                          <p className="text-sm text-[#0f2640] font-medium">{request.sitterName}</p>
                        </div>
                      )}

                      {request.audience === 'direct' && request.requestedSitterName && request.status === 'open' && (
                        <div className="mb-4 p-3 bg-[#fff7ef] border border-[#ffd7bf] rounded-lg">
                          <p className="text-sm text-[#6b7280]">{t('Direct request sent to:', 'Suora pyyntö lähetetty:')}</p>
                          <p className="text-sm text-[#0f2640] font-medium">{request.requestedSitterName}</p>
                          <p className="mt-1 text-sm text-[#516173]">
                            {t('This sitter can see it in Direct asks.', 'Tämä hoitaja näkee pyynnön suorissa pyynnöissään.')}
                          </p>
                        </div>
                      )}

                      {request.status === 'cancelled' && getCancellationCreditNotice(request, 'owner', language) && (
                        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3">
                          <p className="text-sm font-medium text-red-700">
                            {getCancellationCreditNotice(request, 'owner', language)}
                          </p>
                        </div>
                      )}

                      {request.status === 'open' && request.audience !== 'direct' && (
                        <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                          <p className="text-sm text-[#6b7280] mb-2">
                            {t('Offers to help:', 'Tarjouksia avuksi:')} {request.applications?.length || 0}
                          </p>
                          {!request.applications || request.applications.length === 0 ? (
                            <p className="text-sm text-[#6b7280]">{t('No offers yet.', 'Ei vielä tarjouksia.')}</p>
                          ) : (
                            <div className="space-y-2">
                              {request.applications.map((application) => (
                                <div
                                  key={application.sitterId}
                                  className="flex items-center justify-between border border-gray-100 rounded p-2"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-[#0f2640]">
                                      {application.sitterName}
                                    </p>
                                    {application.message && (
                                      <p className="text-xs text-[#6b7280]">{application.message}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleAcceptApplicant(request, application)}
                                    disabled={actioningRequestId === request.id}
                                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    {actioningRequestId === request.id ? t('Processing...', 'Käsitellään...') : t('Choose sitter', 'Valitse hoitaja')}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {request.status === 'completed' && (
                        <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                          {request.review ? (
                            <>
                              <p className="text-sm font-medium text-[#0f2640] mb-1">{t('Your review', 'Arvostelusi')}</p>
                              <p className="text-sm text-[#0f2640]">Rating: {request.review.rating}/5</p>
                              <p className="text-sm text-[#6b7280]">{request.review.comment || t('No comment', 'Ei kommenttia')}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-[#0f2640] mb-2">{t('Rate this sitter', 'Arvostele hoitaja')}</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <select
                                  value={reviewRatings[request.id] || ''}
                                  onChange={(e) =>
                                    setReviewRatings((prev) => ({
                                      ...prev,
                                      [request.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="">{t('Rating', 'Arvosana')}</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="4">4</option>
                                  <option value="5">5</option>
                                </select>
                                <input
                                  type="text"
                                  value={reviewComments[request.id] || ''}
                                  onChange={(e) =>
                                    setReviewComments((prev) => ({
                                      ...prev,
                                      [request.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={t('Short comment', 'Lyhyt kommentti')}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm md:col-span-2"
                                />
                              </div>
                              <button
                                onClick={() => handleSubmitReview(request)}
                                disabled={actioningRequestId === request.id}
                                className="mt-2 px-3 py-1 text-sm bg-[#ff7a2d] text-white rounded hover:bg-[#e66a1f] transition-colors disabled:opacity-50"
                              >
                                {actioningRequestId === request.id ? t('Submitting...', 'Lähetetään...') : t('Send review', 'Lähetä arvostelu')}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {request.status === 'open' && (
                          <>
                            <button
                              onClick={() => handleEdit(request)}
                              className="px-3 py-1 text-sm border border-[#ff7a2d] text-[#ff7a2d] rounded hover:bg-[#ff7a2d] hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCancelRequest(request)}
                              className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {request.status === 'awaiting_confirmation' && (
                          <>
                            <button
                              onClick={() => handleConfirmCompletion(request)}
                              disabled={actioningRequestId === request.id}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {actioningRequestId === request.id ? t('Processing...', 'Käsitellään...') : t('Confirm care is finished', 'Vahvista hoito päättyneeksi')}
                            </button>
                            <button
                              onClick={() => handleCancelAcceptedRequest(request)}
                              disabled={actioningRequestId === request.id}
                              className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                              {actioningRequestId === request.id ? t('Processing...', 'Käsitellään...') : t('Cancel pet care', 'Peruuta lemmikinhoito')}
                            </button>
                          </>
                        )}
                        {request.status === 'accepted' && (
                          <>
                            <button
                              onClick={() => handleCancelAcceptedRequest(request)}
                              disabled={actioningRequestId === request.id}
                              className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                              {actioningRequestId === request.id ? t('Processing...', 'Käsitellään...') : t('Cancel pet care', 'Peruuta lemmikinhoito')}
                            </button>
                          </>
                        )}
                        {(request.status === 'open' ||
                          (request.status === 'cancelled' && !request.sitterId)) && (
                          <button
                            onClick={() => handleDelete(request)}
                            className="px-3 py-1 text-sm border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                          >
                            {t('Delete', 'Poista')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}

            {activeTab === 'direct-requests' && (
              <div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
                  <h2 className="text-2xl font-bold text-[#0f2640]">{t('Direct asks', 'Suorat pyynnöt')}</h2>
                  <p className="mt-2 text-sm text-[#6b7280]">
                    {t('These pet-care requests were sent only to you.', 'Nämä hoitopyynnöt on lähetetty vain sinulle.')}
                  </p>
                </div>

                {directRequests.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-[#6b7280]">{t('No direct asks right now.', 'Ei suoria hoitopyyntöjä juuri nyt.')}</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {directRequests.map((request) => (
                      <div
                        key={`${request.ownerId}-${request.id}`}
                        className="bg-white rounded-2xl border border-[#ffd7bf] p-6 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-[#0f2640]">{request.petNames.join(', ')}</h3>
                            <p className="text-sm text-[#6b7280]">Owner: {request.ownerName}</p>
                          </div>
                          <span className="rounded-full bg-[#fff1e6] px-3 py-1 text-xs font-medium text-[#ff7a2d]">
                            {t('Direct ask', 'Suora pyyntö')}
                          </span>
                        </div>

                        <div className="mb-3">
                          <span className="inline-block rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-medium text-[#0f2640]">
                            {getCareTypeLabel(request.careType)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div>
                            <p className="text-[#6b7280]">{t('Starts', 'Alkaa')}</p>
                            <p className="font-medium text-[#0f2640]">
                              {formatRequestDateTime(request.startDate, language)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[#6b7280]">{t('Ends', 'Päättyy')}</p>
                            <p className="font-medium text-[#0f2640]">
                              {formatRequestDateTime(request.endDate, language)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[#6b7280]">{t('Credits you earn', 'Ansaitsemasi krediitit')}</p>
                            <p className="font-medium text-[#ff7a2d]">{request.creditsOffered}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[#6b7280]">{t('Location', 'Sijainti')}</p>
                            <p className="font-medium text-[#0f2640]">{request.location}</p>
                          </div>
                        </div>

                        <div className="mb-4 rounded-xl border border-[#d7e1eb] bg-[#f7fafc] p-3 text-sm text-[#516173]">
                          {t('You can accept this direct ask even if you have not added a public availability slot.', 'Voit hyväksyä tämän suoran pyynnön, vaikka et olisi lisännyt julkista vapaata aikaa.')}
                        </div>

                        {request.notes && (
                          <div className="mb-4 rounded-xl bg-gray-50 p-3">
                            <p className="text-sm text-[#6b7280] mb-1">{t('Notes', 'Lisätiedot')}</p>
                            <p className="text-sm text-[#0f2640]">{request.notes}</p>
                          </div>
                        )}

                        <button
                          onClick={() => handleAcceptDirectRequest(request)}
                          disabled={processingCommunityRequestId === request.id}
                          className="w-full bg-[#ff7a2d] text-white py-2 px-4 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                        >
                          {processingCommunityRequestId === request.id ? t('Processing...', 'Käsitellään...') : t('Accept direct ask', 'Hyväksy suora pyyntö')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'community' && (
              <div>
                {highlightedRequestId ? (
                  <div className="mb-6 rounded-2xl border border-[#ded3c2] bg-white p-5">
                    <button
                      type="button"
                      onClick={handleBrowseAllCommunityRequests}
                      className="text-sm font-semibold text-[#425266] hover:text-[#0f2640]"
                    >
                      &larr; Browse all requests
                    </button>
                    <h2 className="mt-4 text-2xl font-bold text-[#0f2640]">{t('Request details', 'Pyynnön tiedot')}</h2>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {t('This is the request you selected from your dashboard.', 'Tämä on hallintapaneelista valitsemasi pyyntö.')}
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div className="w-full md:max-w-sm">
                        <label htmlFor="community-requests-city" className="mb-1 block text-sm font-medium text-[#0f2640]">{t('City', 'Kaupunki')}</label>
                        <CitySelect
                          id="community-requests-city"
                          value={cityFilter}
                          onChange={setCityFilter}
                          emptyLabel="All cities"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        onClick={handleBrowseAllCommunityRequests}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#0f2640] transition-colors hover:bg-gray-50"
                      >
                        {t('Browse all', 'Näytä kaikki')}
                      </button>
                    </div>
                    <p className="mt-3 text-sm text-[#6b7280]">
                      {t('These are pet-care requests from owners. Offer to help only when the time works for you.', 'Nämä ovat omistajien hoitopyyntöjä. Tarjoudu auttamaan vain silloin, kun ajankohta sopii sinulle.')}
                    </p>
                  </div>
                )}

                {visibleCommunityRequests.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                    <p className="text-[#6b7280]">
                      {highlightedRequestId
                        ? t('This request could not be found or is no longer open.', 'Pyyntöä ei löytynyt tai se ei ole enää avoin.')
                        : t('No open pet-care requests found.', 'Avoimia hoitopyyntöjä ei löytynyt.')}
                    </p>
                    <p className="mt-2 text-sm text-[#6b7280]">
                      {highlightedRequestId
                        ? t('Browse all open requests to see what is currently available.', 'Selaa kaikkia avoimia pyyntöjä nähdäksesi tämänhetkisen tarjonnan.')
                        : t('Try changing the city.', 'Kokeile vaihtaa paikkakuntaa.')}
                    </p>
                    {highlightedRequestId && (
                      <button
                        type="button"
                        onClick={handleBrowseAllCommunityRequests}
                        className="mt-4 rounded-full bg-[#ff7a2d] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
                      >
                        {t('Browse all requests', 'Selaa kaikkia pyyntöjä')}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!highlightedRequestId && (
                      <p className="text-sm font-semibold text-[#425266]">
                        Showing {visibleCommunityRequests.length} open request{visibleCommunityRequests.length === 1 ? '' : 's'}.
                      </p>
                    )}
                    <div className={highlightedRequestId ? 'max-w-2xl' : 'grid gap-6 md:grid-cols-2 xl:grid-cols-3'}>
                      {visibleCommunityRequests.map((request) => {
                        const applied = isAppliedByCurrentUser(request);
                        const isHighlighted = request.id === highlightedRequestId;

                        return (
                          <div
                            id={`request-${request.id}`}
                            key={`${request.ownerId}-${request.id}`}
                            className={`scroll-mt-28 bg-white rounded-2xl border p-6 hover:shadow-lg transition-shadow ${
                              isHighlighted
                                ? 'border-[#e96b2c] ring-2 ring-[#ffd7be]'
                                : 'border-gray-200'
                            }`}
                          >
                          {isHighlighted && (
                            <p className="mb-3 inline-flex rounded-full bg-[#fff1e7] px-3 py-1 text-xs font-bold text-[#b94f1d]">
                              {t('Selected request', 'Valittu pyyntö')}
                            </p>
                          )}
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <ProfileAvatar
                                uid={request.ownerId}
                                name={request.ownerName || t('Pet owner', 'Lemmikin omistaja')}
                                className="h-12 w-12 shrink-0 rounded-full border border-[#efe3ee]"
                              />
                              <div className="min-w-0">
                                <h3 className="truncate text-lg font-bold text-[#0f2640]">
                                  {request.ownerName || t('Pet owner', 'Lemmikin omistaja')}
                                </h3>
                                <p className="truncate text-sm text-[#6b7280]">
                                  {request.petNames.join(', ') || t('Pet care request', 'Hoitopyyntö')}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                              {getRequestStatusText(request)}
                            </span>
                          </div>

                          <div className="mb-3">
                            <span className="inline-block bg-[#ff7a2d]/10 text-[#ff7a2d] px-3 py-1 rounded-full text-sm font-medium">
                              {getCareTypeLabel(request.careType)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                              <p className="text-[#6b7280]">{t('Dates', 'Päivämäärät')}</p>
                              <p className="font-medium text-[#0f2640]">
                                {request.startDate.toLocaleDateString()} - {request.endDate.toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#6b7280]">{t('Credits you earn', 'Ansaitsemasi krediitit')}</p>
                              <p className="font-medium text-[#ff7a2d]">{request.creditsOffered}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[#6b7280]">{t('Location', 'Sijainti')}</p>
                              <p className="font-medium text-[#0f2640]">{request.location}</p>
                            </div>
                          </div>

                          {request.notes && (
                            <div className="mb-4 rounded-xl bg-gray-50 p-3">
                              <p className="text-sm text-[#6b7280] mb-1">{t('Notes', 'Lisätiedot')}</p>
                              <p className="text-sm text-[#0f2640]">{request.notes}</p>
                            </div>
                          )}

                          {(request.feedingSchedule ||
                            request.walkSchedule ||
                            request.medicationInstructions ||
                            request.sleepInstructions ||
                            request.specialWarnings) && (
                            <div className="mb-4 p-3 border border-gray-200 rounded-xl text-sm space-y-1">
                              <p className="font-medium text-[#0f2640]">{t('Care Instructions', 'Hoito-ohjeet')}</p>
                              {request.feedingSchedule && (
                                <p className="text-[#6b7280]">
                                  <span className="font-medium text-[#0f2640]">{t('Feeding:', 'Ruokinta:')}</span> {request.feedingSchedule}
                                </p>
                              )}
                              {request.walkSchedule && (
                                <p className="text-[#6b7280]">
                                  <span className="font-medium text-[#0f2640]">{t('Walks:', 'Ulkoilu:')}</span> {request.walkSchedule}
                                </p>
                              )}
                              {request.medicationInstructions && (
                                <p className="text-[#6b7280]">
                                  <span className="font-medium text-[#0f2640]">{t('Medication:', 'Lääkitys:')}</span> {request.medicationInstructions}
                                </p>
                              )}
                              {request.sleepInstructions && (
                                <p className="text-[#6b7280]">
                                  <span className="font-medium text-[#0f2640]">{t('Sleep:', 'Nukkuminen:')}</span> {request.sleepInstructions}
                                </p>
                              )}
                              {request.specialWarnings && (
                                <p className="text-[#6b7280]">
                                  <span className="font-medium text-[#0f2640]">{t('Warnings:', 'Huomioitavaa:')}</span> {request.specialWarnings}
                                </p>
                              )}
                            </div>
                          )}

                          {!applied && (
                            <textarea
                              value={applicationMessages[request.id] || ''}
                              onChange={(e) =>
                                setApplicationMessages((prev) => ({
                                  ...prev,
                                  [request.id]: e.target.value,
                                }))
                              }
                              rows={2}
                              placeholder={t('Optional message to the owner', 'Valinnainen viesti omistajalle')}
                              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          )}

                          {applied ? (
                            <button
                              onClick={() => handleWithdraw(request)}
                              disabled={processingCommunityRequestId === request.id}
                              className="w-full border border-gray-400 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
                            >
                              {processingCommunityRequestId === request.id ? t('Processing...', 'Käsitellään...') : t('Withdraw offer', 'Peru tarjous')}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApply(request)}
                              disabled={processingCommunityRequestId === request.id}
                              className="w-full bg-[#ff7a2d] text-white py-2 px-4 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                            >
                              {processingCommunityRequestId === request.id ? t('Sending...', 'Lähetetään...') : t('Offer to help', 'Tarjoudu auttamaan')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openReportModal(request)}
                            className="w-full mt-2 border border-red-300 text-red-700 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors font-medium"
                          >
                            {t('Report request', 'Ilmoita pyynnöstä')}
                          </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my-sits' && (
              <div>
                <h2 className="text-2xl font-bold text-[#0f2640] mb-4">{t('Care I give', 'Antamani hoito')}</h2>
                {sitterJobs.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-[#6b7280]">
                      {t('You are not helping with any pet care yet. Check Direct asks or browse Requests to help.', 'Et ole vielä mukana yhdessäkään hoidossa. Tarkista suorat pyynnöt tai selaa avoimia hoitopyyntöjä.')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sitterJobs.map((request) => (
                    <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-[#0f2640] mb-1">
                            {request.petNames.join(', ')}
                          </h3>
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {getRequestStatusText(request)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#ff7a2d]">{t(`${request.creditsOffered} credits`, `${request.creditsOffered} krediittiä`)}</p>
                          {request.status === 'accepted' && (
                            <p className="text-xs text-green-600">{t('You receive these after the owner confirms the care is finished.', 'Saat krediitit, kun omistaja vahvistaa hoidon päättyneeksi.')}</p>
                          )}
                          {request.status === 'awaiting_confirmation' && (
                            <p className="text-xs text-yellow-600">{t('Waiting for the owner to confirm.', 'Odotetaan omistajan vahvistusta.')}</p>
                          )}
                          {request.status === 'completed' && (
                            <p className="text-xs text-green-600">{t('(Earned)', '(Ansaittu)')}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-[#6b7280]">{t('Owner:', 'Omistaja:')}</p>
                          <p className="text-[#0f2640] font-medium">{request.ownerName}</p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">{t('Care type:', 'Hoitomuoto:')}</p>
                          <p className="text-[#0f2640] font-medium">
                            {getCareTypeLabel(request.careType)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">{t('Location:', 'Sijainti:')}</p>
                          <p className="text-[#0f2640] font-medium">{request.location}</p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">{t('Starts:', 'Alkaa:')}</p>
                          <p className="text-[#0f2640] font-medium">
                            {formatRequestDateTime(request.startDate, language)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">{t('Ends:', 'Päättyy:')}</p>
                          <p className="text-[#0f2640] font-medium">
                            {formatRequestDateTime(request.endDate, language)}
                          </p>
                        </div>
                      </div>

                      {request.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-[#6b7280]">{t('Notes:', 'Lisätiedot:')}</p>
                          <p className="text-sm text-[#0f2640]">{request.notes}</p>
                        </div>
                      )}

                      {(request.feedingSchedule ||
                        request.walkSchedule ||
                        request.medicationInstructions ||
                        request.sleepInstructions ||
                        request.specialWarnings) && (
                        <div className="mb-4 p-3 border border-gray-200 rounded-lg text-sm space-y-1">
                          <p className="font-medium text-[#0f2640]">{t('Care Instructions', 'Hoito-ohjeet')}</p>
                          {request.feedingSchedule && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Feeding:', 'Ruokinta:')}</span>{' '}
                              {request.feedingSchedule}
                            </p>
                          )}
                          {request.walkSchedule && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Walks:', 'Ulkoilu:')}</span>{' '}
                              {request.walkSchedule}
                            </p>
                          )}
                          {request.medicationInstructions && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Medication:', 'Lääkitys:')}</span>{' '}
                              {request.medicationInstructions}
                            </p>
                          )}
                          {request.sleepInstructions && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Sleep:', 'Nukkuminen:')}</span>{' '}
                              {request.sleepInstructions}
                            </p>
                          )}
                          {request.specialWarnings && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">{t('Warnings:', 'Huomioitavaa:')}</span>{' '}
                              {request.specialWarnings}
                            </p>
                          )}
                        </div>
                      )}

                      {request.status === 'cancelled' && getCancellationCreditNotice(request, 'sitter', language) && (
                        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3">
                          <p className="text-sm font-medium text-red-700">
                            {getCancellationCreditNotice(request, 'sitter', language)}
                          </p>
                        </div>
                      )}

                      {request.status === 'accepted' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMarkAwaitingConfirmation(request)}
                            disabled={actioningRequestId === request.id}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {actioningRequestId === request.id ? t('Processing...', 'Käsitellään...') : t('Mark care as finished', 'Merkitse hoito päättyneeksi')}
                          </button>
                          <button
                            onClick={() => handleCancelAcceptedRequest(request)}
                            disabled={actioningRequestId === request.id}
                            className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {actioningRequestId === request.id ? t('Processing...', 'Käsitellään...') : t('Cancel pet care', 'Peruuta lemmikinhoito')}
                          </button>
                        </div>
                      )}
                      {request.status === 'awaiting_confirmation' && (
                        <div className="flex gap-2">
                          <div className="px-3 py-1 text-sm bg-yellow-50 border border-yellow-300 text-yellow-700 rounded">
                            {t('Awaiting owner confirmation', 'Odottaa omistajan vahvistusta')}
                          </div>
                          <button
                            onClick={() => handleCancelAcceptedRequest(request)}
                            disabled={actioningRequestId === request.id}
                            className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {actioningRequestId === request.id ? t('Processing...', 'Käsitellään...') : t('Cancel pet care', 'Peruuta lemmikinhoito')}
                          </button>
                        </div>
                      )}
                    </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {confirmationDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2640]/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-dialog-title"
        >
          <div className="w-full max-w-[28rem] rounded-[24px] border border-[#ead9ca] bg-white p-6 shadow-[0_24px_70px_rgba(15,38,64,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e96b2c]">
                  TassuKaveri
                </p>
                <h2 id="confirmation-dialog-title" className="mt-2 text-2xl font-bold text-[#0f2640]">
                  {confirmationDialog.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeConfirmationDialog(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e6d8ca] text-xl leading-none text-[#6b7280] transition-colors hover:bg-[#fff7ef]"
                aria-label={t('Close confirmation dialog', 'Sulje vahvistusikkuna')}
              >
                x
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#516173]">
              {confirmationDialog.message}
            </p>
            {confirmationDialog.requiresArrangementAcknowledgement && (
              <div className="mt-5 rounded-2xl border border-[#d8cbbb] bg-[#fcfbf8] p-4 text-sm text-[#516173]">
                <p className="font-bold text-[#0f2640]">{t('Before confirming', 'Ennen vahvistamista')}</p>
                <p className="mt-2 leading-6">{t(PLATFORM_ROLE_NOTICE, 'TassuKaveri auttaa lemmikin omistajia ja hoitajia löytämään toisensa. Hoidosta sovitaan suoraan käyttäjien kesken. Keskustelkaa ennen vahvistamista lemmikin tarpeista, käyttäytymisestä, lääkityksestä, hätäyhteystiedoista, kotiin pääsystä, krediiteistä, vakuutuksista ja muista hoitoehdoista.')}</p>
                <p className="mt-2 leading-6">{t(MEET_AND_GREET_RECOMMENDATION, 'Turvallisuuden ja lemmikin hyvinvoinnin vuoksi suosittelemme tutustumistapaamista ennen ensimmäisen hoidon vahvistamista. Tämä on suositus, ei TassuKaverin antama takuu.')}</p>
                <label className="mt-4 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={confirmationAcknowledged}
                    onChange={(event) => setConfirmationAcknowledged(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="font-semibold text-[#0f2640]">
                    {t(PLATFORM_ROLE_ACKNOWLEDGEMENT, 'Ymmärrän, että TassuKaveri on yhteydenpitoalusta ja että lemmikin omistaja ja hoitaja sopivat hoidosta suoraan keskenään.')}
                  </span>
                </label>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirmationDialog(false)}
                className="rounded-full border border-[#d8cbbb] px-5 py-3 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fff7ef]"
              >
                {confirmationDialog.cancelLabel ?? t('Cancel', 'Peruuta')}
              </button>
              <button
                type="button"
                onClick={() => closeConfirmationDialog(true)}
                disabled={
                  confirmationDialog.requiresArrangementAcknowledgement && !confirmationAcknowledged
                }
                className={`rounded-full px-5 py-3 text-sm font-bold text-white transition-colors ${
                  confirmationDialog.tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#e96b2c] hover:bg-[#d95f23]'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {confirmationDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportingRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2640]/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-request-title"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleReportCommunityRequest();
            }}
            className="w-full max-w-[30rem] rounded-[24px] border border-[#ead9ca] bg-white p-6 shadow-[0_24px_70px_rgba(15,38,64,0.24)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e96b2c]">
                  {t('Report request', 'Ilmoita pyynnöstä')}
                </p>
                <h2 id="report-request-title" className="mt-2 text-2xl font-bold text-[#0f2640]">
                  {t('Tell us what feels wrong', 'Kerro, mikä pyynnössä on vialla')}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeReportModal}
                disabled={reportSubmitting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e6d8ca] text-xl leading-none text-[#6b7280] transition-colors hover:bg-[#fff7ef] disabled:opacity-50"
                aria-label={t('Close report dialog', 'Sulje ilmoitusikkuna')}
              >
                x
              </button>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#fff7ef] p-3">
              <ProfileAvatar
                uid={reportingRequest.ownerId}
                name={reportingRequest.ownerName || t('Pet owner', 'Lemmikin omistaja')}
                className="h-11 w-11 shrink-0 rounded-full border border-[#efe3ee]"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#0f2640]">
                  {reportingRequest.ownerName || t('Pet owner', 'Lemmikin omistaja')}
                </p>
                <p className="truncate text-sm text-[#6b7280]">
                  {reportingRequest.petNames.join(', ') || t('Pet care request', 'Hoitopyyntö')}
                </p>
              </div>
            </div>

            <label htmlFor="report-reason" className="mt-5 block text-sm font-semibold text-[#0f2640]">
              {t('Reason', 'Syy')}
            </label>
            <textarea
              id="report-reason"
              value={reportReason}
              onChange={(event) => {
                setReportReason(event.target.value);
                if (reportError) {
                  setReportError('');
                }
              }}
              rows={5}
              disabled={reportSubmitting}
              placeholder={t('Describe the problem, for example unsafe details, spam, or inappropriate content.', 'Kuvaile ongelma, esimerkiksi turvattomat tiedot, roskaposti tai asiaton sisältö.')}
              className="mt-2 w-full resize-none rounded-2xl border border-[#d8cbbb] px-4 py-3 text-sm text-[#0f2640] outline-none transition-colors placeholder:text-[#8a95a3] focus:border-[#ff7a2d] focus:ring-2 focus:ring-[#ffd6bf] disabled:bg-gray-50"
            />

            {reportError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {reportError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeReportModal}
                disabled={reportSubmitting}
                className="rounded-full border border-[#d8cbbb] px-5 py-3 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fff7ef] disabled:opacity-50"
              >
                {t('Cancel', 'Peruuta')}
              </button>
              <button
                type="submit"
                disabled={reportSubmitting}
                className="rounded-full bg-[#e96b2c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d95f23] disabled:opacity-50"
              >
                {reportSubmitting ? t('Sending...', 'Lähetetään...') : t('Send report', 'Lähetä ilmoitus')}
              </button>
            </div>
          </form>
        </div>
      )}
    </ProtectedRoute>
  );
}

export default function RequestsPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-[#6b7280]">{t('Loading requests...', 'Ladataan hoitopyyntöjä...')}</div>
        </div>
      }
    >
      <RequestsPageContent />
    </Suspense>
  );
}
