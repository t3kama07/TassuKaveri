'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import AvailabilityPlanner from '@/components/AvailabilityPlanner';
import CitySelect from '@/components/CitySelect';
import ProfileAvatar from '@/components/ProfileAvatar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getProfile,
  isProfileCompleted,
  updateProfile,
  updateUserLocation,
} from '@/lib/profileService';
import { uploadProfileImage } from '@/lib/profileImageService';
import {
  getProfileAvatarUrl,
  isProfileAvatarUrl,
  PROFILE_AVATAR_OPTIONS,
} from '@/lib/profileAvatar';
import { getPetTypeLabel, PET_TYPE_OPTIONS } from '@/lib/petOptions';
import { getWallet } from '@/lib/walletService';
import { AvailabilityStatus, ExperienceLevel, UserProfile } from '@/types/profile';

type ProfileTab = 'details' | 'availability' | 'settings';

const PET_SIZE_OPTIONS = ['small', 'medium', 'large'];

function toggleArrayValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function sameStringArray(values: string[], otherValues: string[]): boolean {
  if (values.length !== otherValues.length) {
    return false;
  }

  const left = [...values].sort();
  const right = [...otherValues].sort();
  return left.every((value, index) => value === right[index]);
}

function formatOptionLabel(value: string, language: 'en' | 'fi'): string {
  if (language === 'fi') {
    return ({
      small: 'Pieni',
      medium: 'Keskikokoinen',
      large: 'Suuri',
      beginner: 'Aloittelija',
      intermediate: 'Kokenut',
      expert: 'Erittäin kokenut',
    } as Record<string, string>)[value] || value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatList(values: string[], emptyLabel: string, language: 'en' | 'fi'): string {
  return values.length > 0 ? values.map((value) => formatOptionLabel(value, language)).join(', ') : emptyLabel;
}

function formatPetTypeList(values: string[], emptyLabel: string, language: 'en' | 'fi'): string {
  const finnishLabels: Record<string, string> = {
    dog: 'Koirat', cat: 'Kissat', rabbit: 'Kanit', bird: 'Linnut',
    'small-mammal': 'Piennisäkkäät', reptile: 'Matelijat', fish: 'Kalat', other: 'Muut lemmikit',
  };
  return values.length > 0
    ? values.map((value) => language === 'fi' ? finnishLabels[value] || value : getPetTypeLabel(value, true)).join(', ')
    : emptyLabel;
}

function formatDateText(date: Date | undefined, language: 'en' | 'fi'): string {
  if (!date || Number.isNaN(date.getTime())) {
    return language === 'fi' ? 'Ei saatavilla' : 'Not available';
  }

  return date.toLocaleDateString(language === 'fi' ? 'fi-FI' : 'en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<ProfileTab>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('Finland');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [petExperience, setPetExperience] = useState('');
  const [availability, setAvailability] = useState<AvailabilityStatus>('available');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [petTypeExperience, setPetTypeExperience] = useState<string[]>([]);
  const [preferredPetSize, setPreferredPetSize] = useState<string[]>([]);
  const [experienceWithLargeDogs, setExperienceWithLargeDogs] = useState(false);
  const [experienceWithSeniorPets, setExperienceWithSeniorPets] = useState(false);
  const experienceWithDogs = petTypeExperience.includes('dog');
  const experienceWithCats = petTypeExperience.includes('cat');

  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const inputClassName =
    'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-[#0f2640] transition focus:border-[#ff7a2d] focus:outline-none focus:ring-2 focus:ring-[#ffe0cc]';

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [profileData, wallet] = await Promise.all([
        getProfile(user.uid),
        getWallet(user.uid),
      ]);
      setCreditBalance(wallet?.balance ?? 0);
      if (profileData) {
        setProfile(profileData);
        setName(profileData.name);
        setLocation(profileData.location);
        setCountry(profileData.country);
        setPhotoURL(profileData.photoURL);
        setBio(profileData.bio);
        setPetExperience(profileData.petExperience);
        setAvailability(profileData.availability);
        setLatitude(profileData.latitude !== undefined ? String(profileData.latitude) : '');
        setLongitude(profileData.longitude !== undefined ? String(profileData.longitude) : '');
        setExperienceLevel(profileData.experienceLevel);
        setPetTypeExperience(profileData.petTypeExperience);
        setPreferredPetSize(profileData.preferredPetSize);
        setExperienceWithLargeDogs(profileData.experienceWithLargeDogs);
        setExperienceWithSeniorPets(profileData.experienceWithSeniorPets);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t('We could not load your profile right now. Please try again. ', 'Profiiliasi ei voitu ladata juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const parsedLat = latitude.trim() === '' ? undefined : Number(latitude);
      const parsedLng = longitude.trim() === '' ? undefined : Number(longitude);

      if (parsedLat !== undefined && (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90)) {
        throw new Error(t('Latitude must be between -90 and 90', 'Leveysasteen on oltava välillä −90–90'));
      }
      if (parsedLng !== undefined && (!Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180)) {
        throw new Error(t('Longitude must be between -180 and 180', 'Pituusasteen on oltava välillä −180–180'));
      }

      await updateProfile(user.uid, {
        name,
        location,
        country,
        photoURL,
        bio,
        petExperience,
        availability,
        latitude: parsedLat,
        longitude: parsedLng,
        experienceLevel,
        petTypeExperience,
        preferredPetSize,
        experienceWithDogs: petTypeExperience.includes('dog'),
        experienceWithCats: petTypeExperience.includes('cat'),
        experienceWithLargeDogs: petTypeExperience.includes('dog') && experienceWithLargeDogs,
        experienceWithSeniorPets,
      });

      await updateUserLocation(user.uid, location);

      setSuccess(t('Profile saved.', 'Profiili tallennettu.'));
      setIsEditing(false);
      await loadProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t('We could not save your profile right now. Please check the fields and try again. ', 'Profiilia ei voitu tallentaa. Tarkista tiedot ja yritä uudelleen. ') + message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!user || !selectedFile) {
      return;
    }

    setPhotoUploading(true);
    setError('');
    setSuccess('');

    try {
      const uploadedPhotoURL = await uploadProfileImage(user.uid, selectedFile);
      setPhotoURL(uploadedPhotoURL);
      setSuccess(t('Profile photo uploaded. Save changes to update your profile.', 'Profiilikuva ladattu. Päivitä profiili tallentamalla muutokset.'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t('We could not upload this photo right now. Please try again. ', 'Kuvaa ei voitu ladata juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleCancel() {
    if (!profile) return;
    setName(profile.name);
    setLocation(profile.location);
    setCountry(profile.country);
    setPhotoURL(profile.photoURL);
    setBio(profile.bio);
    setPetExperience(profile.petExperience);
    setAvailability(profile.availability);
    setLatitude(profile.latitude !== undefined ? String(profile.latitude) : '');
    setLongitude(profile.longitude !== undefined ? String(profile.longitude) : '');
    setExperienceLevel(profile.experienceLevel);
    setPetTypeExperience(profile.petTypeExperience);
    setPreferredPetSize(profile.preferredPetSize);
    setExperienceWithLargeDogs(profile.experienceWithLargeDogs);
    setExperienceWithSeniorPets(profile.experienceWithSeniorPets);
    setIsEditing(false);
    setError('');
    setSuccess('');
  }

  function handleTabChange(nextTab: ProfileTab) {
    if (nextTab === activeTab) {
      return;
    }

    if (isEditing) {
      if (hasUnsavedChanges) {
        const shouldDiscard = window.confirm(
          t('You have unsaved profile changes. Discard them and switch tabs?', 'Profiilissa on tallentamattomia muutoksia. Hylätäänkö ne ja vaihdetaan välilehteä?')
        );

        if (!shouldDiscard) {
          return;
        }
      }

      handleCancel();
    }

    setActiveTab(nextTab);
  }

  const profileComplete = profile ? isProfileCompleted(profile) : false;
  const hasUnsavedChanges = Boolean(
    profile
    && (
      name !== profile.name
      || location !== profile.location
      || country !== profile.country
      || photoURL !== profile.photoURL
      || bio !== profile.bio
      || petExperience !== profile.petExperience
      || availability !== profile.availability
      || latitude !== (profile.latitude !== undefined ? String(profile.latitude) : '')
      || longitude !== (profile.longitude !== undefined ? String(profile.longitude) : '')
      || experienceLevel !== profile.experienceLevel
      || !sameStringArray(petTypeExperience, profile.petTypeExperience)
      || !sameStringArray(preferredPetSize, profile.preferredPetSize)
      || petTypeExperience.includes('dog') !== profile.experienceWithDogs
      || petTypeExperience.includes('cat') !== profile.experienceWithCats
      || (petTypeExperience.includes('dog') && experienceWithLargeDogs) !== profile.experienceWithLargeDogs
      || experienceWithSeniorPets !== profile.experienceWithSeniorPets
    )
  );

  function handlePetTypeToggle(value: string) {
    const removingDog = value === 'dog' && petTypeExperience.includes('dog');
    setPetTypeExperience((currentValues) => toggleArrayValue(currentValues, value));

    if (removingDog) {
      setPreferredPetSize([]);
      setExperienceWithLargeDogs(false);
    }
  }
  const profileName = profile?.name.trim() || user?.email?.split('@')[0] || t('Your profile', 'Profiilisi');
  const profileLocation = profile
    ? `${profile.location}, ${language === 'fi' && profile.country === 'Finland' ? 'Suomi' : profile.country}`
    : t('Location not added yet', 'Sijaintia ei ole vielä lisätty');
  const heroBio =
    profile?.bio.trim() || t('Add a short intro so pet owners quickly understand your style.', 'Lisää lyhyt esittely, jotta lemmikinomistajat tutustuvat nopeasti tapaasi toimia.');
  const selectedPresetAvatar = PROFILE_AVATAR_OPTIONS.find(
    (option) => photoURL === getProfileAvatarUrl(option.id)
  )?.id;
  const hasCoordinates = latitude.trim() !== '' && longitude.trim() !== '';
  const ratingSummary =
    profile && profile.ratingCount > 0
      ? t(
          `${profile.ratingAverage.toFixed(1)} / 5 (${profile.ratingCount} review${profile.ratingCount > 1 ? 's' : ''})`,
          `${profile.ratingAverage.toFixed(1)} / 5 (${profile.ratingCount} ${profile.ratingCount === 1 ? 'arvostelu' : 'arvostelua'})`
        )
      : t('No ratings yet', 'Ei vielä arvosteluja');
  const checklistItems = [
    { label: t('Name and location added', 'Nimi ja sijainti lisätty'), done: Boolean(name.trim()) && Boolean(location.trim()) },
    { label: t('Profile photo or avatar selected', 'Profiilikuva tai hahmokuva valittu'), done: Boolean(photoURL.trim()) },
    { label: t('Short bio added', 'Lyhyt esittely lisätty'), done: Boolean(bio.trim()) },
    { label: t('Pet experience added', 'Kokemus lemmikeistä lisätty'), done: Boolean(petExperience.trim()) },
    { label: t('Pet types added', 'Eläinlajit lisätty'), done: petTypeExperience.length > 0 },
  ];
  const checklistDoneCount = checklistItems.filter((item) => item.done).length;
  const checklistProgress = Math.round((checklistDoneCount / checklistItems.length) * 100);
  const careHighlights = [
    experienceWithDogs ? t('Dog experience', 'Kokemusta koirista') : null,
    experienceWithCats ? t('Cat experience', 'Kokemusta kissoista') : null,
    experienceWithLargeDogs ? t('Large dog care', 'Suurten koirien hoito') : null,
    experienceWithSeniorPets ? t('Senior pet care', 'Ikääntyneiden lemmikkien hoito') : null,
  ].filter((item): item is string => item !== null);
  const profileTabs: Array<{ id: ProfileTab; label: string; description: string }> = [
    { id: 'details', label: t('Basic information', 'Perustiedot'), description: t('Your name, photo, location, and care style.', 'Nimi, kuva, sijainti ja tapasi hoitaa lemmikkejä.') },
    { id: 'availability', label: t('Times I can help', 'Ajat, jolloin voin auttaa'), description: t('Add the times when you can care for pets.', 'Lisää ajat, jolloin voit hoitaa lemmikkejä.') },
    { id: 'settings', label: t('Trust and verification', 'Luottamus ja vahvistukset'), description: t('Email and account details.', 'Sähköposti- ja tilitiedot.') },
  ];

  function renderDetailsTab() {
    if (!profile) {
      return null;
    }

    return (
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0f2640]">{t('Basic information', 'Perustiedot')}</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                {t('Your profile helps other users decide if they can trust you.', 'Profiilisi auttaa muita käyttäjiä arvioimaan, sopisitko heidän lemmikkinsä hoitajaksi.')}
              </p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-full bg-[#ff7a2d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
              >
                {t('Edit Profile', 'Muokkaa profiilia')}
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="rounded-2xl border border-[#e5edf6] bg-[#f8fbff] p-5">
                <h3 className="text-lg font-bold text-[#0f2640]">{t('Profile photo', 'Profiilikuva')}</h3>
                <div className="mt-4 rounded-2xl border border-dashed border-[#d7e2ef] bg-white p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <ProfileAvatar
                      uid={profile.uid}
                      name={profileName}
                      photoURL={photoURL}
                      className="h-[88px] w-[88px] rounded-3xl border border-gray-200"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0f2640]">{t('Profile photo', 'Profiilikuva')}</p>
                      <p className="mt-1 text-sm text-[#6b7280]">
                        {t('Upload a clear image or choose a friendly avatar for your profile.', 'Lataa selkeä kuva tai valitse profiiliisi ystävällinen hahmokuva.')}
                      </p>

                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={photoUploading}
                          className="rounded-full bg-[#ff7a2d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
                        >
                          {photoUploading ? t('Uploading...', 'Ladataan...') : photoURL ? t('Replace image', 'Vaihda kuva') : t('Upload image', 'Lataa kuva')}
                        </button>
                        {photoURL && (
                          <button
                            type="button"
                            onClick={() => setPhotoURL('')}
                            disabled={photoUploading}
                            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f7fafc] disabled:opacity-50"
                          >
                            {t('Remove image', 'Poista kuva')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#edf2f7] pt-4">
                    <p className="text-sm font-semibold text-[#0f2640]">{t('Choose an avatar', 'Valitse hahmokuva')}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {PROFILE_AVATAR_OPTIONS.map((option) => {
                        const avatarUrl = getProfileAvatarUrl(option.id);
                        const selected = selectedPresetAvatar === option.id;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setPhotoURL(avatarUrl)}
                            className={`flex items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-colors ${
                              selected
                                ? 'border-[#ff7a2d] ring-2 ring-[#ffd7be]'
                                : 'border-[#d7e2ef] hover:border-[#ffcfb2]'
                            }`}
                            aria-pressed={selected}
                          >
                            <ProfileAvatar
                              name={option.label}
                              photoURL={avatarUrl}
                              className="h-11 w-11 rounded-2xl border border-gray-200"
                            />
                            <span className="text-xs font-semibold text-[#0f2640]">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {!photoURL && (
                      <p className="mt-3 text-xs text-[#6b7280]">
                        {t('If you do not choose one, TassuKaveri shows an automatic avatar.', 'Jos et valitse kuvaa, TassuKaveri näyttää automaattisesti luodun hahmokuvan.')}
                      </p>
                    )}
                    {photoURL && isProfileAvatarUrl(photoURL) && (
                      <p className="mt-3 text-xs text-[#6b7280]">
                        {t('Save changes to use this avatar across your profile.', 'Tallenna muutokset, jotta hahmokuva näkyy profiilissasi.')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-[#0f2640]">{t('Name', 'Nimi')}</label>
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-city" className="mb-1 block text-sm font-medium text-[#0f2640]">{t('City', 'Kaupunki')}</label>
                    <CitySelect
                      id="profile-city"
                      value={location}
                      onChange={setLocation}
                      required
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-country" className="mb-1 block text-sm font-medium text-[#0f2640]">{t('Country', 'Maa')}</label>
                    <input
                      id="profile-country"
                      type="text"
                      value={language === 'fi' && country === 'Finland' ? 'Suomi' : country}
                      readOnly
                      aria-readonly="true"
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5edf6] bg-white p-5">
                <h3 className="text-lg font-bold text-[#0f2640]">{t('About you', 'Tietoa sinusta')}</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="profile-bio" className="mb-1 block text-sm font-medium text-[#0f2640]">{t('Short intro', 'Lyhyt esittely')}</label>
                    <textarea
                      id="profile-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-pet-experience" className="mb-1 block text-sm font-medium text-[#0f2640]">{t('Pet care experience', 'Kokemus lemmikkien hoidosta')}</label>
                    <textarea
                      id="profile-pet-experience"
                      value={petExperience}
                      onChange={(e) => setPetExperience(e.target.value)}
                      rows={4}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5edf6] bg-white p-5">
                <h3 className="text-lg font-bold text-[#0f2640]">{t('Care experience and preferences', 'Hoitokokemus ja toiveet')}</h3>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {t('Be specific about the animals and care you are comfortable providing. Owners use these details when choosing a sitter.', 'Kerro tarkasti, mitä eläimiä ja millaista hoitoa pystyt tarjoamaan. Omistajat käyttävät näitä tietoja hoitajaa valitessaan.')}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="profile-availability" className="mb-1 block text-sm font-medium text-[#0f2640]">{t('Can you help now?', 'Voitko auttaa nyt?')}</label>
                    <select
                      id="profile-availability"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
                      className={inputClassName}
                    >
                      <option value="available">{t('Available', 'Saatavilla')}</option>
                      <option value="unavailable">{t('Unavailable', 'Ei saatavilla')}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="profile-experience-level" className="mb-1 block text-sm font-medium text-[#0f2640]">{t('Experience level', 'Kokemustaso')}</label>
                    <select
                      id="profile-experience-level"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                      className={inputClassName}
                    >
                      <option value="beginner">{t('Beginner', 'Aloittelija')}</option>
                      <option value="intermediate">{t('Intermediate', 'Kokenut')}</option>
                      <option value="expert">{t('Expert', 'Erittäin kokenut')}</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="mb-1 text-sm font-medium text-[#0f2640]">{t('Animals you can care for', 'Eläimet, joita voit hoitaa')}</p>
                    <p className="mb-3 text-sm text-[#6b7280]">{t('Select every type you can care for confidently.', 'Valitse kaikki eläinlajit, joita osaat hoitaa turvallisesti.')}</p>
                    <div className="flex flex-wrap gap-2">
                      {PET_TYPE_OPTIONS.map((option) => {
                        const selected = petTypeExperience.includes(option.value);

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handlePetTypeToggle(option.value)}
                            aria-pressed={selected}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                              selected
                                ? 'bg-[#ff7a2d] text-white'
                                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-[#f7fafc]'
                            }`}
                          >
                            {formatPetTypeList([option.value], option.pluralLabel, language)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {petTypeExperience.includes('dog') && (
                  <div className="rounded-2xl border border-gray-200 bg-[#fcfdff] p-4">
                    <p className="mb-1 text-sm font-medium text-[#0f2640]">{t('Dog sizes you are comfortable with', 'Sinulle sopivat koirien koot')}</p>
                    <p className="mb-3 text-sm text-[#6b7280]">{t('Select all sizes you are prepared to handle safely.', 'Valitse kaikki koot, joita pystyt käsittelemään turvallisesti.')}</p>
                    <div className="flex flex-wrap gap-2">
                      {PET_SIZE_OPTIONS.map((option) => {
                        const selected = preferredPetSize.includes(option);

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setPreferredPetSize((currentValues) =>
                                toggleArrayValue(currentValues, option)
                              )
                            }
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                              selected
                                ? 'bg-[#0f2640] text-white'
                                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-[#f7fafc]'
                            }`}
                          >
                            {formatOptionLabel(option, language)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}
                </div>

                <div className="mt-5">
                  <p className="mb-3 text-sm font-medium text-[#0f2640]">{t('Additional care experience', 'Muu hoitokokemus')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                  {petTypeExperience.includes('dog') && (
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fcfdff] px-4 py-3 text-sm text-[#0f2640]">
                    <input
                      type="checkbox"
                      checked={experienceWithLargeDogs}
                      onChange={(e) => setExperienceWithLargeDogs(e.target.checked)}
                    />
                    {t('Confident handling large dogs', 'Osaan käsitellä suuria koiria turvallisesti')}
                  </label>
                  )}
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fcfdff] px-4 py-3 text-sm text-[#0f2640]">
                    <input
                      type="checkbox"
                      checked={experienceWithSeniorPets}
                      onChange={(e) => setExperienceWithSeniorPets(e.target.checked)}
                    />
                    {t('Experienced with senior pets', 'Kokemusta ikääntyneiden lemmikkien hoidosta')}
                  </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
                >
                  {saving ? t('Saving...', 'Tallennetaan...') : t('Save Changes', 'Tallenna muutokset')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f7fafc]"
                >
                  {t('Cancel', 'Peruuta')}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 space-y-5">
              <ProfileAvatar
                uid={profile.uid}
                name={profile.name}
                photoURL={profile.photoURL}
                className="h-[88px] w-[88px] rounded-3xl border border-gray-200"
              />
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">{t('Name', 'Nimi')}</p>
                  <p className="mt-1 text-sm text-[#516173]">{profile.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">{t('Location', 'Sijainti')}</p>
                  <p className="mt-1 text-sm text-[#516173]">{profile.location}, {language === 'fi' && profile.country === 'Finland' ? 'Suomi' : profile.country}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">{t('Times I can help', 'Ajat, jolloin voin auttaa')}</p>
                  <p className="mt-1 text-sm text-[#516173]">
                    {profile.availability === 'available' ? t('Open for bookings', 'Ottaa vastaan hoitopyyntöjä') : t('Bookings paused', 'Hoitopyynnöt keskeytetty')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">{t('Experience level', 'Kokemustaso')}</p>
                  <p className="mt-1 text-sm capitalize text-[#516173]">{formatOptionLabel(profile.experienceLevel, language)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">{t('Pet types', 'Eläinlajit')}</p>
                  <p className="mt-1 text-sm text-[#516173]">
                    {formatPetTypeList(petTypeExperience, t('Not specified yet', 'Ei vielä määritetty'), language)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">{t('Dog size comfort', 'Sopivat koirien koot')}</p>
                  <p className="mt-1 text-sm text-[#516173]">
                    {petTypeExperience.includes('dog')
                      ? formatList(preferredPetSize, t('Not specified yet', 'Ei vielä määritetty'), language)
                      : t('Not applicable', 'Ei koske tätä profiilia')}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#f8fbff] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">{t('About you', 'Tietoa sinusta')}</p>
                <p className="mt-2 text-sm text-[#516173]">{profile.bio || t('No bio added yet.', 'Esittelyä ei ole vielä lisätty.')}</p>
              </div>

              <div className="rounded-2xl bg-[#fffaf6] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">{t('Pet care experience', 'Kokemus lemmikkien hoidosta')}</p>
                <p className="mt-2 text-sm text-[#516173]">
                  {profile.petExperience || t('No pet care notes added yet.', 'Hoitokokemuksesta ei ole vielä lisätty tietoja.')}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#0f2640]">{t('Care Highlights', 'Hoitokokemuksen vahvuudet')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {careHighlights.length > 0 ? (
                    careHighlights.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-medium text-[#0f2640]"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-sm font-medium text-[#4b5563]">
                      {t('Add highlights while editing your profile.', 'Lisää profiilisi vahvuudet muokkaustilassa.')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#0f2640]">{t('Profile strength', 'Profiilin kattavuus')}</h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {t('Small wins that make the profile easier to trust.', 'Pienet täydennykset tekevät profiilistasi luotettavamman.')}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#0f2640]">
                {checklistDoneCount}/{checklistItems.length}
              </p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-[#eef2ff]">
              <div
                className="h-2 rounded-full bg-[#ff7a2d] transition-all"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
            <div className="mt-5 space-y-3">
              {checklistItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-[#fcfdff] px-4 py-3"
                >
                  <p className="text-sm text-[#0f2640]">{item.label}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.done ? 'bg-[#ecfdf3] text-[#047857]' : 'bg-[#fff7ed] text-[#c2410c]'
                    }`}
                  >
                    {item.done ? t('Done', 'Valmis') : t('To do', 'Täydennettävä')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderAvailabilityTab() {
    if (!profile) {
      return null;
    }

    return (
      <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0f2640]">{t('Times I can help', 'Ajat, jolloin voin auttaa')}</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              {t('Add the times when you are open to pet care requests.', 'Lisää ajat, jolloin voit ottaa vastaan hoitopyyntöjä.')}
            </p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-[#f8fbff] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">{t('Current booking status', 'Nykyinen varaustilanne')}</p>
                <p className="mt-2 text-sm text-[#516173]">
                  {availability === 'available'
                    ? t('Your profile is open for new booking requests.', 'Profiilisi ottaa vastaan uusia hoitopyyntöjä.')
                    : t('Your profile is paused. Turn it back on from Basic information when ready.', 'Profiilisi ei ota nyt vastaan pyyntöjä. Voit avata sen uudelleen Perustiedot-välilehdellä.')}
                </p>
              </div>

              <div className="rounded-2xl bg-[#fffaf6] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">{t('Recommended setup', 'Suositeltu asetus')}</p>
                <p className="mt-2 text-sm text-[#516173]">
                  {t('Add your next few open windows so owners can request help faster without too much back and forth.', 'Lisää muutama seuraava vapaa ajankohta, jotta omistajat voivat pyytää apuasi ilman turhaa edestakaista viestittelyä.')}
                </p>
              </div>

            </div>
          </div>
        </div>

        <AvailabilityPlanner userId={profile.uid} />
      </section>
    );
  }

  function renderSettingsTab() {
    if (!profile) {
      return null;
    }

    return (
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#0f2640]">{t('Trust and verification', 'Luottamus ja vahvistukset')}</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            {t('Verified information helps other users feel safer choosing you.', 'Vahvistetut tiedot lisäävät muiden käyttäjien turvallisuuden tunnetta hoitajaa valittaessa.')}
          </p>

          <div className="mt-6 max-w-xl">
            <div className="rounded-2xl border border-gray-200 bg-[#fcfdff] p-4">
              <p className="text-sm text-[#6b7280]">{t('Email status', 'Sähköpostin tila')}</p>
              <p className="mt-2 text-lg font-bold text-[#0f2640]">
                {profile.emailVerified ? t('Verified', 'Vahvistettu') : t('Pending', 'Odottaa vahvistusta')}
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">{profile.email}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0f2640]">{t('Account overview', 'Tilin yhteenveto')}</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              {t('Useful details to keep handy.', 'Hyödylliset tilitiedot yhdessä paikassa.')}
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">{t('Credits', 'Krediitit')}</p>
                <p className="mt-1 text-sm text-[#516173]">{t(`${creditBalance} credits`, `${creditBalance} krediittiä`)}</p>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {t('Spend credits when someone cares for your pet. Earn credits when you help others.', 'Käytä krediittejä, kun joku hoitaa lemmikkiäsi. Ansaitse krediittejä auttamalla muita.')}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">{t('Role', 'Rooli')}</p>
                <p className="mt-1 text-sm text-[#516173]">{profile.role === 'admin' ? t('Admin', 'Ylläpitäjä') : t('Member', 'Jäsen')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">{t('Member since', 'Jäsen alkaen')}</p>
                <p className="mt-1 text-sm text-[#516173]">{formatDateText(profile.createdAt, language)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">{t('Last updated', 'Viimeksi päivitetty')}</p>
                <p className="mt-1 text-sm text-[#516173]">{formatDateText(profile.updatedAt, language)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">{t('Location detail', 'Sijaintitiedot')}</p>
                <p className="mt-1 text-sm text-[#516173]">
                  {hasCoordinates ? t('Exact location added', 'Tarkka sijainti lisätty') : t('Using city-level location', 'Käytössä paikkakuntatasoinen sijainti')}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">{t('Trust level', 'Luottamustaso')}</p>
                <p className="mt-1 text-sm text-[#516173]">{profile.trustScore}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">{t('Rating', 'Arvosana')}</p>
                <p className="mt-1 text-sm text-[#516173]">{ratingSummary}</p>
              </div>
              <div className="rounded-2xl border border-dashed border-gray-300 bg-[#fafafa] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">{t('Best next step', 'Suositeltu seuraava vaihe')}</p>
                <p className="mt-2 text-sm text-[#516173]">
                  {t('Finish your details, keep your email verified, and add a few times you can help.', 'Täydennä profiilisi, pidä sähköpostiosoitteesi vahvistettuna ja lisää muutama ajankohta, jolloin voit auttaa.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <p className="text-[#6b7280]">{t('Loading profile...', 'Ladataan profiilia...')}</p>
          </div>
        ) : !profile ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <p className="text-red-700">{t('Profile not found. Please contact support.', 'Profiilia ei löytynyt. Ota yhteyttä tukeen.')}</p>
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(135deg,#fff7ef_0%,#ffffff_42%,#eef5ff_100%)] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#ff7a2d]">
                    {t('My Profile', 'Oma profiili')}
                  </p>

                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                    <ProfileAvatar
                      uid={profile.uid}
                      name={profileName}
                      photoURL={profile.photoURL}
                      className="h-24 w-24 rounded-3xl border border-white/80 shadow-sm"
                    />

                    <div className="min-w-0">
                      <h1 className="text-3xl font-bold text-[#0f2640] sm:text-4xl">
                        {profileName}
                      </h1>
                      <p className="mt-2 text-base text-[#516173]">{profileLocation}</p>
                      <p className="mt-4 max-w-3xl text-[#516173]">{heroBio}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('details');
                        setIsEditing(true);
                      }}
                      className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
                    >
                      {profileComplete ? t('Edit profile', 'Muokkaa profiilia') : t('Finish profile', 'Viimeistele profiili')}
                    </button>
                    <p className="text-sm text-[#6b7280]">
                      {t('Use the tabs below to manage your profile and times you can help.', 'Hallitse profiiliasi ja vapaita hoitoaikojasi alla olevilla välilehdillä.')}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-medium text-[#0f2640]">
                      {profile.availability === 'available' ? t('Open for bookings', 'Ottaa vastaan pyyntöjä') : t('Bookings paused', 'Pyynnöt tauolla')}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        profileComplete ? 'bg-[#ecfdf3] text-[#047857]' : 'bg-[#fff7ed] text-[#c2410c]'
                      }`}
                    >
                      {profileComplete ? t('Profile complete', 'Profiili valmis') : t('Profile needs attention', 'Profiili kaipaa täydennystä')}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        profile.emailVerified ? 'bg-[#eef5ff] text-[#1d4ed8]' : 'bg-[#f3f4f6] text-[#4b5563]'
                      }`}
                    >
                      {profile.emailVerified ? t('Email verified', 'Sähköposti vahvistettu') : t('Email not verified', 'Sähköpostia ei ole vahvistettu')}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">{t('Profile status', 'Profiilin tila')}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">
                      {profileComplete ? t('Ready', 'Valmis') : t('In progress', 'Kesken')}
                    </p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {profileComplete ? t('You look ready for matching.', 'Profiilisi on valmis hoitovaihtoon.') : t('A few details still need attention.', 'Muutama tieto puuttuu vielä.')}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">{t('Credits', 'Krediitit')}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">{creditBalance}</p>
                    <p className="mt-1 text-sm text-[#6b7280]">{t('Available for upcoming exchanges.', 'Käytettävissä tuleviin hoitovaihtoihin.')}</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">{t('Trust level', 'Luottamustaso')}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">{profile.trustScore}</p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {t('Based on your verified email, profile, completed care, and reviews.', 'Perustuu vahvistettuun sähköpostiin, profiiliin, toteutuneisiin hoitoihin ja arvosteluihin.')}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">{t('Rating', 'Arvosana')}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">
                      {profile.ratingCount > 0 ? profile.ratingAverage.toFixed(1) : t('New', 'Uusi')}
                    </p>
                    <p className="mt-1 text-sm text-[#6b7280]">{ratingSummary}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
              <div className="grid gap-2 md:grid-cols-3">
                {profileTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`h-full rounded-2xl px-4 py-4 text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#0f2640] text-white'
                        : 'bg-white text-[#0f2640] hover:bg-[#f7fafc]'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{tab.label}</span>
                    <span
                      className={`mt-1 block text-xs ${
                        activeTab === tab.id ? 'text-white/80' : 'text-[#6b7280]'
                      }`}
                    >
                      {tab.description}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'availability' && renderAvailabilityTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
