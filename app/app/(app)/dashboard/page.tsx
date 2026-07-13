'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProfileAvatar from '@/components/ProfileAvatar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAvailabilitySlots } from '@/lib/availabilityService';
import { getUserPets } from '@/lib/petService';
import { getProfile, isProfileCompleted } from '@/lib/profileService';
import {
  getAllOpenRequests,
  getSitterRequests,
  getUserRequests,
} from '@/lib/requestService';
import { getAvailableSitters, NearbySitter } from '@/lib/sitterService';
import { getWallet } from '@/lib/walletService';
import { UserProfile } from '@/types/profile';
import { Request } from '@/types/request';
import { Wallet } from '@/types/wallet';

type OnboardingChoice = 'need-care' | 'help-sitter' | 'both';

const ONBOARDING_CHOICE_KEY = 'tassukaveri-onboarding-choice';

function formatDateLabel(date: Date, language: 'en' | 'fi'): string {
  return date.toLocaleDateString(language === 'fi' ? 'fi-FI' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateRange(startDate: Date, endDate: Date, language: 'en' | 'fi'): string {
  return `${formatDateLabel(startDate, language)}–${formatDateLabel(endDate, language)}`;
}

function OnboardingIcon({ type }: { type: OnboardingChoice }) {
  if (type === 'need-care') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-10 w-10">
        <path d="M14 34 32 18l18 16v17a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V34Z" fill="#fff7ed" stroke="#0f2640" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M22 54V39c0-5.5 4.5-10 10-10s10 4.5 10 10v15" fill="#ffe2c8" stroke="#0f2640" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M11 34 32 15l21 19" fill="none" stroke="#e96b2c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="27" cy="40" r="2.4" fill="#0f2640" />
        <circle cx="37" cy="40" r="2.4" fill="#0f2640" />
        <path d="M29 47c2 1.8 4.2 1.8 6 0" fill="none" stroke="#0f2640" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M45 52c2.8-4 8.4-4 11 0-2.4 2.8-8.8 2.8-11 0Z" fill="#70bfd1" stroke="#0f2640" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'help-sitter') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-10 w-10">
        <path d="M13 40c7 9 16 13 28 12l8-.8c4-.4 6-4.8 3.4-7.8-1.4-1.6-3.6-2.2-5.7-1.5l-9.4 3.2" fill="#ffe2c8" stroke="#0f2640" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 39c6-1 12 0 17 4" fill="none" stroke="#0f2640" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M29 17c-5 0-9 4-9 9 0 9 11 15 12 16 1-1 12-7 12-16 0-5-4-9-9-9-2.5 0-4.8 1.1-6 3-1.2-1.9-3.5-3-6-3Z" fill="#ff7a2d" stroke="#0f2640" strokeWidth="2.4" strokeLinejoin="round" />
        <circle cx="25.5" cy="27.5" r="2.2" fill="white" />
        <circle cx="36.5" cy="27.5" r="2.2" fill="white" />
        <path d="M29 34c2 1.5 4 1.5 6 0" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M49 22c3 1 5 3 6 6" fill="none" stroke="#70bfd1" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-10 w-10">
      <path d="M18 36c0-12 8-20 19-20 9 0 16 5 18 13" fill="none" stroke="#70bfd1" strokeWidth="4" strokeLinecap="round" />
      <path d="m52 22 4 8-9 1" fill="none" stroke="#70bfd1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 28c0 11-8 20-19 20-9 0-16-5-18-13" fill="none" stroke="#e96b2c" strokeWidth="4" strokeLinecap="round" />
      <path d="m12 42-4-8 9-1" fill="none" stroke="#e96b2c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="12" fill="#fff7ed" stroke="#0f2640" strokeWidth="2.4" />
      <circle cx="27" cy="31" r="2.2" fill="#0f2640" />
      <circle cx="37" cy="31" r="2.2" fill="#0f2640" />
      <path d="M29 38c2.2 1.6 4.8 1.6 7 0" fill="none" stroke="#0f2640" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M32 20c-2-4-6-5-9-3 1 4 4 6 9 6 5 0 8-2 9-6-3-2-7-1-9 3Z" fill="#f2c47e" stroke="#0f2640" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}

function getPreviewRequests(requests: Request[], profile: UserProfile | null): Request[] {
  if (!profile?.location.trim()) {
    return requests.slice(0, 3);
  }

  const normalizedLocation = profile.location.trim().toLowerCase();
  const nearbyRequests = requests.filter((request) =>
    request.location.toLowerCase().includes(normalizedLocation)
  );

  return (nearbyRequests.length > 0 ? nearbyRequests : requests).slice(0, 3);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [openItems, setOpenItems] = useState(0);
  const [nearbySitters, setNearbySitters] = useState<NearbySitter[]>([]);
  const [communityRequests, setCommunityRequests] = useState<Request[]>([]);
  const [petCount, setPetCount] = useState(0);
  const [availabilityCount, setAvailabilityCount] = useState(0);
  const [onboardingChoice, setOnboardingChoice] = useState<OnboardingChoice | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedChoice = window.localStorage.getItem(ONBOARDING_CHOICE_KEY);
    if (
      savedChoice === 'need-care' ||
      savedChoice === 'help-sitter' ||
      savedChoice === 'both'
    ) {
      setOnboardingChoice(savedChoice);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      if (!user) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        if (active) {
          setLoading(true);
          setError('');
        }

        const userProfile = await getProfile(user.uid);
        const [userWallet, userRequests, userSits, sitters, openRequests, userPets, slots] = await Promise.all([
          getWallet(user.uid),
          getUserRequests(user.uid),
          getSitterRequests(user.uid),
          getAvailableSitters({
            excludeUserId: user.uid,
            city: userProfile?.location || '',
            latitude: userProfile?.latitude,
            longitude: userProfile?.longitude,
            maxDistanceKm: 15,
            limit: 24,
          }),
          getAllOpenRequests(user.uid, { limit: 24 }),
          getUserPets(user.uid),
          getAvailabilitySlots(user.uid),
        ]);

        if (!active) {
          return;
        }

        const activeOwnerRequests = userRequests.filter((request) =>
          ['open', 'accepted', 'awaiting_confirmation'].includes(request.status)
        );
        const activeSits = userSits.filter((request) =>
          ['accepted', 'awaiting_confirmation'].includes(request.status)
        );

        setProfile(userProfile);
        setWallet(
          userWallet ?? {
            balance: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        );
        setOpenItems(activeOwnerRequests.length + activeSits.length);
        setNearbySitters(sitters.slice(0, 3));
        setCommunityRequests(getPreviewRequests(openRequests, userProfile));
        setPetCount(userPets.length);
        setAvailabilityCount(slots.length);
      } catch (err: unknown) {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
        setError(t(
          'We could not load your home page right now. Please try again. ',
          'Etusivua ei voitu ladata juuri nyt. Yritä uudelleen. '
        ) + message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHomeData();

    return () => {
      active = false;
    };
  }, [t, user]);

  const welcomeName = profile?.name.trim() || user?.email?.split('@')[0] || t('there', 'sinä');
  const profileIncomplete = !profile || !isProfileCompleted(profile);
  const hasPets = petCount > 0;
  const hasAvailability = availabilityCount > 0;

  function handleOnboardingChoice(choice: OnboardingChoice) {
    setOnboardingChoice(choice);
    window.localStorage.setItem(ONBOARDING_CHOICE_KEY, choice);
  }

  const checklistItems = [
    {
      label: t('Complete your profile', 'Täydennä profiilisi'),
      done: !profileIncomplete,
      href: '/profile',
      action: t('Complete your profile', 'Täydennä profiilisi'),
    },
    {
      label: t('Add your pet', 'Lisää lemmikkisi'),
      done: hasPets,
      href: '/pets',
      action: t('Add your first pet', 'Lisää ensimmäinen lemmikkisi'),
    },
    {
      label: t('Choose what you want to do', 'Valitse, mitä haluat tehdä'),
      done: Boolean(onboardingChoice),
      href: '/dashboard',
      action: t('Choose a goal', 'Valitse tavoitteesi'),
    },
    {
      label: t('Ask for pet care or offer to help', 'Pyydä lemmikinhoitoa tai tarjoa apuasi'),
      done: hasPets || hasAvailability,
      href: hasPets ? '/exchange?tab=my-requests&create=1' : '/profile',
      action: hasPets ? t('Ask for pet care', 'Pyydä lemmikinhoitoa') : t('Add times you can help', 'Lisää ajat, jolloin voit auttaa'),
    },
    {
      label: t('Check messages and notifications', 'Tarkista viestit ja ilmoitukset'),
      done: openItems > 0,
      href: '/notifications',
      action: t('Check updates', 'Tarkista päivitykset'),
    },
  ];

  const nextActions = [
    profileIncomplete
      ? { label: t('Complete your profile', 'Täydennä profiilisi'), href: '/profile' }
      : null,
    onboardingChoice !== 'help-sitter' && !hasPets
      ? { label: t('Add your first pet', 'Lisää ensimmäinen lemmikkisi'), href: '/pets' }
      : null,
    !hasAvailability
      ? { label: t('Add times you can help', 'Lisää ajat, jolloin voit auttaa'), href: '/profile' }
      : null,
    onboardingChoice !== 'help-sitter' && hasPets
      ? { label: t('Ask for pet care', 'Pyydä lemmikinhoitoa'), href: '/exchange?tab=my-requests&create=1' }
      : null,
    (onboardingChoice === 'help-sitter' || onboardingChoice === 'both') && hasAvailability
      ? { label: t('Find requests to help with', 'Etsi hoitopyyntöjä, joissa voit auttaa'), href: '/exchange?tab=community&view=all' }
      : null,
  ].filter((item): item is { label: string; href: string } => item !== null);
  const completedSetupCount = checklistItems.filter((item) => item.done).length;
  const setupProgressPercent = Math.round((completedSetupCount / checklistItems.length) * 100);
  const primaryNextAction =
    nextActions[0] || { label: t('View notifications', 'Näytä ilmoitukset'), href: '/notifications' };

  const onboardingChoices: Array<{ value: OnboardingChoice; label: string; description: string }> = [
    { value: 'need-care', label: t('I need pet care', 'Tarvitsen lemmikinhoitoa'), description: t('Find a trusted sitter for your pet.', 'Löydä lemmikillesi luotettava hoitaja.') },
    { value: 'help-sitter', label: t('I want to help', 'Haluan auttaa'), description: t('Care for pets nearby and earn credits.', 'Hoida lähialueen lemmikkejä ja ansaitse krediittejä.') },
    { value: 'both', label: t('A bit of both', 'Molempia'), description: t('Find care and help others too.', 'Löydä hoitoa ja auta myös muita.') },
  ];

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-[1180px] space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[26px] border border-[#ded3c2] bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_360px] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#e96b2c]">
                {t('Home', 'Etusivu')}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#0f2640] sm:text-4xl">
                {t('Welcome back,', 'Tervetuloa takaisin,')} {welcomeName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#425266] sm:text-base">
                {t(
                  'TassuKaveri helps you find trusted sitters, help nearby pet owners, and exchange credits without money changing hands.',
                  'TassuKaverissa löydät luotettavia hoitajia, autat lähialueen lemmikinomistajia ja vaihdat hoitoapua krediiteillä ilman rahaa.'
                )}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/exchange?tab=my-requests&create=1"
                  className="rounded-full bg-[#e96b2c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d95f23]"
                >
                  {t('Ask for pet care', 'Pyydä lemmikinhoitoa')}
                </Link>
                <Link
                  href="/sitters"
                  className="rounded-full border border-[#d8cbbb] bg-[#fffdf9] px-5 py-3 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fff7ef]"
                >
                  {t('Find a sitter', 'Etsi hoitaja')}
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#e3d7c7] bg-[#fffaf6] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8794]">{t('Credits', 'Krediitit')}</p>
                <p className="mt-2 text-4xl font-bold text-[#0f2640]">{wallet?.balance ?? 0}</p>
                <p className="mt-2 text-sm leading-5 text-[#6b7280]">
                  {t('Spend credits for care. Earn them by helping others.', 'Käytä krediittejä hoitoon ja ansaitse niitä auttamalla muita.')}
                </p>
              </div>
              <div className="rounded-[18px] border border-[#e3d7c7] bg-[#fffaf6] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8794]">{t('Active care', 'Aktiiviset hoidot')}</p>
                <p className="mt-2 text-4xl font-bold text-[#0f2640]">{openItems}</p>
                <p className="mt-2 text-sm leading-5 text-[#6b7280]">{t('Open requests and accepted care jobs', 'Avoimet pyynnöt ja sovitut hoitotehtävät')}</p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[18px] border border-[#ded3c2] bg-white p-6">
            <p className="text-[#6b7280]">{t('Loading home...', 'Ladataan etusivua...')}</p>
          </div>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_390px]">
              <div className="rounded-[22px] border border-[#ded3c2] bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#0f2640]">{t('Get set up', 'Viimeistele aloitus')}</h2>
                    <p className="mt-1 text-sm text-[#425266]">
                      {t('A few quick steps so sitters know and trust you.', 'Muutama nopea vaihe auttaa hoitajia tutustumaan sinuun ja luottamaan profiiliisi.')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[#b94f1d]">
                    {language === 'fi' ? `${completedSetupCount}/${checklistItems.length} valmiina` : `${completedSetupCount} of ${checklistItems.length} done`}
                  </span>
                </div>

                <div className="mt-4 h-2 rounded-full bg-[#eee8de]">
                  <div
                    className="h-2 rounded-full bg-[#e96b2c] transition-all"
                    style={{ width: `${setupProgressPercent}%` }}
                  />
                </div>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#7a8794]">
                  {t('What do you want to do?', 'Mitä haluat tehdä?')}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {onboardingChoices.map((choice) => {
                    const selected = onboardingChoice === choice.value;

                    return (
                      <button
                        key={choice.value}
                        type="button"
                        onClick={() => handleOnboardingChoice(choice.value)}
                        className={`relative rounded-2xl border p-4 text-left transition-colors ${
                          selected
                            ? 'border-[#e96b2c] bg-[#fff4ec]'
                            : 'border-[#e3d7c7] bg-[#fffdf9] hover:border-[#ffcfb2]'
                        }`}
                      >
                        <span
                          className={`mb-7 inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${
                            selected
                              ? 'border-[#ffd1b8] bg-white shadow-sm'
                              : 'border-[#e3d7c7] bg-[#fffaf6]'
                          }`}
                        >
                          <OnboardingIcon type={choice.value} />
                        </span>
                        {selected && (
                          <span className="absolute right-4 top-4 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e96b2c] text-white">
                            <CheckIcon />
                          </span>
                        )}
                        <span className="block text-base font-bold text-[#0f2640]">{choice.label}</span>
                        <span className="mt-1 block text-sm leading-5 text-[#7a8794]">{choice.description}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 space-y-3">
                  {checklistItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col gap-3 rounded-2xl border border-[#e3d7c7] bg-[#fffdf9] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                            item.done
                              ? 'border-[#d9efe3] bg-[#e8f3ec] text-[#2f7d62]'
                              : 'border-[#d8cbbb] bg-white text-transparent'
                          }`}
                        >
                          {item.done && <CheckIcon />}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#0f2640]">
                            {item.label}
                          </p>
                          <p className="mt-1 text-xs text-[#7a8794]">
                            {item.done ? t('Done', 'Valmis') : t('This helps other users understand and trust you.', 'Tämä auttaa muita käyttäjiä tutustumaan sinuun ja luottamaan profiiliisi.')}
                          </p>
                        </div>
                      </div>
                      {!item.done && (
                        <Link
                          href={item.href}
                          className="rounded-full bg-[#fff1e7] px-4 py-2 text-center text-sm font-bold text-[#b94f1d] transition-colors hover:bg-[#ffe3d2]"
                        >
                          {item.action}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border border-[#f0d8c8] bg-[#fff1e7] p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#e96b2c]">
                    <span className="h-3 w-3 rounded-full bg-[#e96b2c]" />
                  </span>
                  <h3 className="mt-6 text-lg font-bold text-[#0f2640]">{t('How credits work', 'Miten krediitit toimivat')}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#7c3b19]">
                    {t(
                      'Credits replace money. You spend them when someone cares for your pet, and earn them back when you help others. No cash, no pressure.',
                      'Krediitit korvaavat rahan. Käytät niitä, kun joku hoitaa lemmikkiäsi, ja ansaitset niitä auttamalla muita. Ei rahaa eikä maksupainetta.'
                    )}
                  </p>
                </div>

                <div className="rounded-[22px] bg-[#203344] p-6 text-white">
                  <h3 className="text-xl font-bold">{t('Your next step', 'Seuraava vaiheesi')}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#dbe5ef]">
                    {profileIncomplete
                      ? t('Finish your profile so sitters can trust who they are helping.', 'Täydennä profiilisi, jotta hoitajat tietävät, ketä he auttavat.')
                      : onboardingChoice !== 'help-sitter' && !hasPets
                        ? t('Add your pet so sitters know who needs care.', 'Lisää lemmikkisi, jotta hoitajat tietävät, kuka tarvitsee hoitoa.')
                        : !onboardingChoice
                          ? t('Choose whether you need care, want to help, or both.', 'Valitse, tarvitsetko hoitoa, haluatko auttaa vai molempia.')
                          : (onboardingChoice === 'help-sitter' || onboardingChoice === 'both') && !hasAvailability
                            ? t('Add the times you can help so nearby pet owners know when to contact you.', 'Lisää ajat, jolloin voit auttaa, jotta lähialueen lemmikinomistajat tietävät, milloin sinuun voi ottaa yhteyttä.')
                            : onboardingChoice === 'help-sitter'
                              ? t('Browse open pet-care requests and offer help when the time works for you.', 'Selaa avoimia hoitopyyntöjä ja tarjoa apuasi, kun ajankohta sopii sinulle.')
                              : hasPets
                              ? t('Pick a sitter profile and send your first care request.', 'Valitse hoitajan profiili ja lähetä ensimmäinen hoitopyyntösi.')
                            : t('Add times you can help so owners can find you.', 'Lisää ajat, jolloin voit auttaa, jotta omistajat löytävät sinut.')}
                  </p>
                  <Link
                    href={primaryNextAction.href}
                    className="mt-5 block rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fff7ef]"
                  >
                    {primaryNextAction.label}
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#ded3c2] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#0f2640]">{t('Available sitters', 'Saatavilla olevat hoitajat')}</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    {language === 'fi'
                      ? `Lähialueen ${profile?.location ? `(${profile.location}) ` : ''}hoitajia, jotka voivat ehkä auttaa.`
                      : `People near ${profile?.location || 'you'} who may be able to help.`}
                  </p>
                </div>
                <Link
                  href="/sitters"
                  className="text-sm font-semibold text-[#ff7a2d] hover:underline"
                >
                  {t('See all sitters', 'Näytä kaikki hoitajat')}
                </Link>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {nearbySitters.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d8cbbb] bg-[#fffdf9] p-5 md:col-span-3">
                    <p className="text-sm text-[#6b7280]">
                      {t('No sitters to preview right now. Open the sitters page to browse more.', 'Hoitajia ei ole juuri nyt esikatseltavana. Näet lisää hoitajia hoitajasivulta.')}
                    </p>
                  </div>
                ) : (
                  nearbySitters.map((entry) => (
                    <Link
                      key={entry.profile.uid}
                      href={`/sitters/${entry.profile.uid}`}
                      className="rounded-2xl border border-[#ded3c2] bg-white p-5 transition-colors hover:border-[#ffcfb2] hover:bg-[#fffaf6]"
                    >
                      <div className="flex items-start gap-3">
                        <ProfileAvatar
                          uid={entry.profile.uid}
                          name={entry.profile.name}
                          photoURL={entry.profile.photoURL}
                          className="h-12 w-12 shrink-0 rounded-full border border-[#efe3ee]"
                        />
                        <div>
                          <h3 className="text-lg font-bold text-[#0f2640]">{entry.profile.name}</h3>
                          <p className="text-sm text-[#6b7280]">{entry.profile.location}</p>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-[#6b7280]">
                        {entry.profile.bio || t('Friendly sitter profile available to view.', 'Tutustu hoitajan profiiliin.')}
                      </p>
                      <p className="mt-4 text-sm font-medium text-[#0f2640]">
                        {entry.nextAvailableSlot
                          ? `${t('Next slot:', 'Seuraava vapaa aika:')} ${formatDateRange(
                              entry.nextAvailableSlot.startAt,
                              entry.nextAvailableSlot.endAt,
                              language
                            )}`
                          : t('Open for bookings', 'Vapaa ottamaan pyyntöjä')}
                      </p>
                      <p className="mt-4 text-sm font-bold text-[#e96b2c]">{t('View full profile', 'Näytä koko profiili')}</p>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#ded3c2] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#0f2640]">{t('Requests to help with', 'Hoitopyynnöt, joissa voit auttaa')}</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    {t('Pet owners looking for help. Offer only when the time works for you.', 'Lemmikinomistajat etsivät apua. Tarjoudu vain, kun ajankohta sopii sinulle.')}
                  </p>
                </div>
                <Link
                  href="/exchange?tab=community&view=all"
                  className="text-sm font-semibold text-[#ff7a2d] hover:underline"
                >
                  {t('Find open requests', 'Etsi avoimia pyyntöjä')}
                </Link>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {communityRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d8cbbb] bg-[#fffdf9] p-5 md:col-span-3">
                    <p className="text-sm text-[#6b7280]">
                      {t('No community requests to preview right now.', 'Yhteisön hoitopyyntöjä ei ole juuri nyt esikatseltavana.')}
                    </p>
                  </div>
                ) : (
                  communityRequests.map((request) => (
                    <Link
                      key={`${request.ownerId}-${request.id}`}
                      href={`/exchange?tab=community&requestId=${encodeURIComponent(request.id)}`}
                      className="block rounded-2xl border border-[#ded3c2] bg-[#fffdf9] p-5 transition-colors hover:border-[#ffcfb2] hover:bg-[#fff7ef]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <ProfileAvatar
                            uid={request.ownerId}
                            name={request.ownerName || t('Pet owner', 'Lemmikinomistaja')}
                            className="h-12 w-12 shrink-0 rounded-full border border-[#efe3ee]"
                          />
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-[#0f2640]">
                              {request.ownerName || t('Pet owner', 'Lemmikinomistaja')}
                            </h3>
                            <p className="truncate text-sm text-[#6b7280]">
                              {request.petNames.join(', ') || t('Pet care request', 'Lemmikinhoitopyyntö')}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#fff1e6] px-3 py-1 text-xs font-medium text-[#ff7a2d]">
                          {request.creditsOffered} {t('credits', 'krediittiä')}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-[#0f2640]">
                        {formatDateRange(request.startDate, request.endDate, language)}
                      </p>
                      <p className="mt-1 text-sm text-[#6b7280]">{request.location}</p>
                      <p className="mt-4 text-sm font-medium text-[#0f2640]">
                        {request.notes || t('Open request from the community', 'Yhteisön avoin hoitopyyntö')}
                      </p>
                      <p className="mt-4 text-sm font-bold text-[#e96b2c]">
                        {t('View and offer help', 'Näytä pyyntö ja tarjoa apua')}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
