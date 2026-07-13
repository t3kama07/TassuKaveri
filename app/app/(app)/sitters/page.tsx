'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CitySelect from '@/components/CitySelect';
import ProfileAvatar from '@/components/ProfileAvatar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { addFavoriteSitter, getFavoriteSitters, removeFavoriteSitter } from '@/lib/favoriteService';
import { PET_TYPE_OPTIONS } from '@/lib/petOptions';
import { reportUser } from '@/lib/moderationService';
import { getProfile } from '@/lib/profileService';
import { getAvailableSitters, NearbySitter } from '@/lib/sitterService';

function formatAvailabilityWindow(startAt: Date, endAt: Date, language: 'en' | 'fi'): string {
  const locale = language === 'fi' ? 'fi-FI' : 'en-GB';
  return `${startAt.toLocaleDateString(locale)} ${startAt.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endAt.toLocaleDateString(locale)} ${endAt.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatRequestedWindow(startAtValue: string, endAtValue: string, language: 'en' | 'fi'): string | null {
  if (!startAtValue.trim() || !endAtValue.trim()) {
    return null;
  }

  const startAt = new Date(startAtValue);
  const endAt = new Date(endAtValue);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return null;
  }

  return formatAvailabilityWindow(startAt, endAt, language);
}

function getExperienceLabel(level: string, language: 'en' | 'fi'): string {
  switch (level) {
    case 'expert':
      return language === 'fi' ? 'Erittäin kokenut hoitaja' : 'Expert sitter';
    case 'intermediate':
      return language === 'fi' ? 'Kokenut hoitaja' : 'Experienced sitter';
    default:
      return language === 'fi' ? 'Uusi hoitaja' : 'New sitter';
  }
}

function getMatchLabel(matchScore: number, language: 'en' | 'fi'): string {
  if (matchScore >= 80) {
    return language === 'fi' ? 'Erittäin hyvä osuma' : 'Strong match';
  }

  if (matchScore >= 60) {
    return language === 'fi' ? 'Hyvä osuma' : 'Good match';
  }

  return language === 'fi' ? 'Mahdollinen osuma' : 'Possible match';
}

function getPetTypeLabel(value: string, englishLabel: string, language: 'en' | 'fi'): string {
  if (language !== 'fi') return englishLabel;
  return ({
    dog: 'Koira', cat: 'Kissa', rabbit: 'Kani', bird: 'Lintu',
    'small-mammal': 'Piennisäkäs', reptile: 'Matelija', fish: 'Kala', other: 'Muu lemmikki',
  } as Record<string, string>)[value] || englishLabel;
}

interface SitterSearchFilters {
  city?: string;
  requestedStartAt?: string;
  requestedEndAt?: string;
  petType?: string;
  petSize?: string;
  requiredExperienceLevel?: string;
}

export default function SittersPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [sitters, setSitters] = useState<NearbySitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [petType, setPetType] = useState('');
  const [petSize, setPetSize] = useState('');
  const [requiredExperienceLevel, setRequiredExperienceLevel] = useState('');
  const [requestedStartAt, setRequestedStartAt] = useState('');
  const [requestedEndAt, setRequestedEndAt] = useState('');
  const [favoriteSitterIds, setFavoriteSitterIds] = useState<string[]>([]);
  const requestedWindowLabel = formatRequestedWindow(requestedStartAt, requestedEndAt, language);

  useEffect(() => {
    if (!user) {
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        setError('');
        const [profile, favorites] = await Promise.all([
          getProfile(user.uid),
          getFavoriteSitters(user.uid),
        ]);

        setFavoriteSitterIds(favorites.map((favorite) => favorite.sitterId));

        if (profile) {
          setCity(profile.location || '');
        }

        const results = await getAvailableSitters({
          excludeUserId: user.uid,
          city: profile?.location || '',
          petTypes: [],
        });
        setSitters(results);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(t('We could not load sitters right now. Please try again. ', 'Hoitajia ei voitu ladata juuri nyt. Yritä uudelleen. ') + message);
      } finally {
        setLoading(false);
      }
    })();
  }, [t, user]);

  async function runSearch(filters: SitterSearchFilters = {}) {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const nextCity = filters.city ?? city;
      const nextRequestedStartAt = filters.requestedStartAt ?? requestedStartAt;
      const nextRequestedEndAt = filters.requestedEndAt ?? requestedEndAt;
      const nextPetType = filters.petType ?? petType;
      const nextPetSize = filters.petSize ?? petSize;
      const nextRequiredExperienceLevel =
        filters.requiredExperienceLevel ?? requiredExperienceLevel;

      const hasStart = nextRequestedStartAt.trim().length > 0;
      const hasEnd = nextRequestedEndAt.trim().length > 0;
      if (hasStart !== hasEnd) {
        throw new Error(t('Choose both start and end times.', 'Valitse sekä alkamis- että päättymisaika.'));
      }

      let parsedRequestedStartAt: Date | undefined;
      let parsedRequestedEndAt: Date | undefined;

      if (hasStart && hasEnd) {
        parsedRequestedStartAt = new Date(nextRequestedStartAt);
        parsedRequestedEndAt = new Date(nextRequestedEndAt);

        if (
          Number.isNaN(parsedRequestedStartAt.getTime()) ||
          Number.isNaN(parsedRequestedEndAt.getTime())
        ) {
          throw new Error(t('Please enter valid dates and times.', 'Anna kelvolliset päivämäärät ja kellonajat.'));
        }

        if (parsedRequestedEndAt.getTime() <= parsedRequestedStartAt.getTime()) {
          throw new Error(t('The end time must be after the start time.', 'Päättymisajan on oltava alkamisajan jälkeen.'));
        }
      }

      const results = await getAvailableSitters({
        excludeUserId: user.uid,
        city: nextCity,
        petTypes: nextPetType ? [nextPetType] : [],
        petSize: nextPetSize || undefined,
        requiredExperienceLevel: nextRequiredExperienceLevel || undefined,
        requestedStartAt: parsedRequestedStartAt,
        requestedEndAt: parsedRequestedEndAt,
      });
      setSitters(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not search sitters right now. Please try again. ', 'Hoitajahaku epäonnistui. Yritä uudelleen. ') + message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(sitterId: string) {
    if (!user) return;
    const isFavorite = favoriteSitterIds.includes(sitterId);

    if (isFavorite) {
      await removeFavoriteSitter(user.uid, sitterId);
      setFavoriteSitterIds((prev) => prev.filter((id) => id !== sitterId));
    } else {
      await addFavoriteSitter(user.uid, sitterId);
      setFavoriteSitterIds((prev) => [...prev, sitterId]);
    }
  }

  async function handleReportSitter(sitterId: string) {
    if (!user) return;
    const reason = prompt('Tell us what feels wrong with this profile:');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await reportUser(user.uid, sitterId, reason);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('We could not send this report right now. Please try again. ', 'Ilmoitusta ei voitu lähettää juuri nyt. Yritä uudelleen. ') + message);
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-72px)] bg-[#f4eee5] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#0f2640] sm:text-4xl">
            {t('Find a sitter', 'Etsi hoitaja')}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#425266] sm:text-base">
            {t('Calm, trusted people near you. Read profiles, then send a request from the sitter page.', 'Löydä lähialueeltasi luotettavia lemmikinhoitajia. Tutustu profiileihin ja lähetä hoitopyyntö sopivalle hoitajalle.')}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-[18px] border border-[#ded3c2] bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_1fr_1fr_1fr_auto]">
            <div>
              <label htmlFor="sitter-search-city" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                {t('City', 'Kaupunki')}
              </label>
              <CitySelect
                id="sitter-search-city"
                value={city}
                onChange={setCity}
                emptyLabel={t('All cities', 'Kaikki kaupungit')}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              />
            </div>
            <div>
              <label htmlFor="sitter-search-start" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                {t('Care starts', 'Hoito alkaa')}
              </label>
              <input
                id="sitter-search-start"
                type="datetime-local"
                value={requestedStartAt}
                onChange={(e) => setRequestedStartAt(e.target.value)}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              />
            </div>
            <div>
              <label htmlFor="sitter-search-end" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                {t('Care ends', 'Hoito päättyy')}
              </label>
              <input
                id="sitter-search-end"
                type="datetime-local"
                value={requestedEndAt}
                onChange={(e) => setRequestedEndAt(e.target.value)}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              />
            </div>
            <div>
              <label htmlFor="sitter-search-pet-type" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                {t('Pet type', 'Eläinlaji')}
              </label>
              <select
                id="sitter-search-pet-type"
                value={petType}
                onChange={(e) => {
                  setPetType(e.target.value);
                  if (e.target.value !== 'dog') {
                    setPetSize('');
                  }
                }}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              >
                <option value="">{t('Any', 'Kaikki')}</option>
                {PET_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {getPetTypeLabel(option.value, option.singularLabel, language)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => runSearch()}
                className="w-full rounded-xl bg-[#e96b2c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d95f23]"
              >
                {t('Search', 'Hae')}
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
            {petType === 'dog' && (
            <div>
              <label htmlFor="sitter-search-dog-size" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                {t('Dog size', 'Koiran koko')}
              </label>
              <select
                id="sitter-search-dog-size"
                value={petSize}
                onChange={(e) => setPetSize(e.target.value)}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              >
                <option value="">{t('Any', 'Kaikki')}</option>
                <option value="small">{t('Small', 'Pieni')}</option>
                <option value="medium">{t('Medium', 'Keskikokoinen')}</option>
                <option value="large">{t('Large', 'Suuri')}</option>
              </select>
            </div>
            )}
            <div>
              <label htmlFor="sitter-search-experience" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                {t('Experience', 'Kokemus')}</label>
              <select
                id="sitter-search-experience"
                value={requiredExperienceLevel}
                onChange={(e) => setRequiredExperienceLevel(e.target.value)}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              >
                <option value="">{t('Any', 'Kaikki')}</option>
                <option value="beginner">{t('Beginner+', 'Aloittelija tai kokeneempi')}</option>
                <option value="intermediate">{t('Intermediate+', 'Kokenut tai erittäin kokenut')}</option>
                <option value="expert">{t('Expert', 'Erittäin kokenut')}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setCity('');
                  setPetType('');
                  setPetSize('');
                  setRequiredExperienceLevel('');
                  setRequestedStartAt('');
                  setRequestedEndAt('');
                  void runSearch({
                    city: '',
                    requestedStartAt: '',
                    requestedEndAt: '',
                    petType: '',
                    petSize: '',
                    requiredExperienceLevel: '',
                  });
                }}
                className="w-full rounded-xl border border-[#d8cbbb] bg-white px-5 py-3 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fffaf6]"
              >
                {t('Browse all', 'Näytä kaikki')}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#6b7280]">
            <span className="font-semibold text-[#6f7b87]">{t('Quick filters:', 'Pikasuodattimet:')}</span>
            <span className="rounded-full bg-[#fff1e7] px-3 py-2 font-semibold text-[#9a4b22]">
              {city || t('All cities', 'Kaikki kaupungit')}
            </span>
            <span className="rounded-full bg-[#f2f5f8] px-3 py-2 font-semibold text-[#425266]">
              {petType
                ? (() => {
                    const option = PET_TYPE_OPTIONS.find((item) => item.value === petType);
                    return option ? getPetTypeLabel(option.value, option.singularLabel, language) : petType;
                  })()
                : t('Any pet', 'Kaikki lemmikit')}
            </span>
            <span className="rounded-full bg-[#f2f5f8] px-3 py-2 font-semibold text-[#425266]">
              {requiredExperienceLevel ? getExperienceLabel(requiredExperienceLevel, language) : t('Any experience', 'Kaikki kokemustasot')}
            </span>
          </div>

          <p className="mt-4 text-sm text-[#0f2640]">
            {requestedWindowLabel
              ? t(`Showing sitters who are open for bookings around ${requestedWindowLabel}.`, `Näytetään hoitajat, jotka ovat vapaina ajankohdan ${requestedWindowLabel} tienoilla.`)
              : city
                ? t(`Showing sitters who are open for bookings in or near ${city}.`, `Näytetään hoitajat, jotka ottavat vastaan pyyntöjä paikkakunnalla ${city} tai sen lähistöllä.`)
                : t('Showing sitters who are open for bookings.', 'Näytetään hoitajat, jotka ottavat vastaan hoitopyyntöjä.')}
          </p>
        </div>

        {loading ? (
          <div className="rounded-[18px] border border-[#ded3c2] bg-white p-6">
            <p className="text-[#6b7280]">{t('Loading sitters...', 'Ladataan hoitajia...')}</p>
          </div>
        ) : sitters.length === 0 ? (
          <div className="rounded-[18px] border border-[#ded3c2] bg-white p-6">
            <p className="text-[#6b7280]">
              {requestedWindowLabel
                ? t('No sitters found for this search. Try changing the date or city.', 'Haulla ei löytynyt hoitajia. Kokeile toista päivää tai kaupunkia.')
                : t('No sitters found for this search. Try changing the city or filters.', 'Haulla ei löytynyt hoitajia. Kokeile toista kaupunkia tai muuta suodattimia.')}
            </p>
          </div>
        ) : (
          <>
          <p className="mb-4 text-sm text-[#425266]">
            <span className="font-bold text-[#0f2640]">{t(`${sitters.length} sitters`, `${sitters.length} hoitajaa`)}</span>{' '}
            {city
              ? t(`open for bookings in or near ${city}`, `ottaa vastaan pyyntöjä paikkakunnalla ${city} tai sen lähistöllä`)
              : t('open for bookings', 'ottaa vastaan hoitopyyntöjä')}
            {requestedWindowLabel ? t(` for ${requestedWindowLabel}`, ` ajalle ${requestedWindowLabel}`) : ''}.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sitters.map((entry) => (
              <article
                key={entry.profile.uid}
                className="relative flex min-h-[280px] flex-col rounded-[18px] border border-[#ded3c2] bg-white p-5 shadow-sm"
              >
                <button
                  onClick={() => toggleFavorite(entry.profile.uid)}
                  aria-label={favoriteSitterIds.includes(entry.profile.uid) ? t('Remove saved sitter', 'Poista tallennettu hoitaja') : t('Save sitter', 'Tallenna hoitaja')}
                  className={`absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border text-lg transition-colors ${
                    favoriteSitterIds.includes(entry.profile.uid)
                      ? 'border-[#f5c7b0] bg-[#fff1e7] text-[#e96b2c]'
                      : 'border-[#e3d7c7] bg-white text-[#b5a999] hover:bg-[#fffaf6]'
                  }`}
                >
                  {favoriteSitterIds.includes(entry.profile.uid) ? <>&#10084;</> : <>&#9825;</>}
                </button>

                <div className="flex gap-3 pr-10">
                  <ProfileAvatar
                    uid={entry.profile.uid}
                    name={entry.profile.name}
                    photoURL={entry.profile.photoURL}
                    className="h-14 w-14 shrink-0 rounded-full border border-[#efe3ee]"
                  />
                  <div>
                    <h3 className="text-lg font-bold leading-tight text-[#0f2640]">
                      {entry.profile.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#7a8794]">
                      {entry.profile.location || t('Location not added', 'Sijaintia ei ole lisätty')}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-[#edf3f7] px-3 py-1 text-xs font-bold text-[#456170]">
                      {getMatchLabel(entry.matchScore, language)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#0f2640]">
                  <span className="font-bold text-[#e6a323]">&#9733;</span>
                  <span>
                  {entry.profile.ratingCount > 0
                    ? `${entry.profile.ratingAverage.toFixed(1)} (${entry.profile.ratingCount})`
                    : t('No ratings', 'Ei arvosteluja')}
                  </span>
                  <span className="text-[#7a8794]">|</span>
                  <span>{getExperienceLabel(entry.profile.experienceLevel, language)}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#e8f3ec] px-3 py-2 text-xs font-bold text-[#245d45]">
                    {t('Open for bookings', 'Ottaa vastaan hoitopyyntöjä')}
                  </span>
                  <span
                    className={`rounded-full px-3 py-2 text-xs font-bold ${
                      entry.profileCompleted
                        ? 'bg-[#e8f3ec] text-[#245d45]'
                        : 'bg-[#f2f5f8] text-[#607080]'
                    }`}
                  >
                    {entry.profileCompleted ? t('Profile complete', 'Profiili valmis') : t('Needs details', 'Tietoja puuttuu')}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-[#425266]">
                  {entry.profile.bio || entry.profile.petExperience || t('No bio yet.', 'Esittelyä ei ole vielä lisätty.')}
                </p>

                {entry.nextAvailableSlot ? (
                  <div className="mt-4 text-sm font-semibold text-[#245d45]">
                    <span className="mr-1">&#9711;</span>
                    {t('Open for bookings - next:', 'Seuraava vapaa aika:')}{' '}
                    <span className="font-normal">
                      {formatAvailabilityWindow(
                        entry.nextAvailableSlot.startAt,
                        entry.nextAvailableSlot.endAt,
                        language
                      )}
                    </span>
                  </div>
                ) : entry.hasDetailedAvailability ? (
                  <p className="mt-4 text-sm font-semibold text-[#245d45]">
                    {t('This sitter is open for bookings, but their detailed time slots are private right now.', 'Hoitaja ottaa vastaan pyyntöjä, mutta tarkat vapaat ajat eivät ole tällä hetkellä julkisia.')}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-[#6b7280]">
                    {t('This sitter has not shared a public time summary yet. You can still contact them directly.', 'Hoitaja ei ole vielä julkaissut yhteenvetoa vapaista ajoistaan. Voit silti ottaa häneen suoraan yhteyttä.')}
                  </p>
                )}

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#eee4d8] pt-4">
                  <button
                    onClick={() => handleReportSitter(entry.profile.uid)}
                    className="text-xs font-semibold text-[#8a97a3] hover:text-red-700"
                  >
                    {t('Report', 'Ilmoita')}
                  </button>
                  <Link
                    href={`/sitters/${entry.profile.uid}`}
                    className="rounded-full bg-[#e96b2c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d95f23]"
                  >
                    {t('View profile', 'Näytä profiili')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          </>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
