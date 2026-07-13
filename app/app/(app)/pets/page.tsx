'use client';

import { useCallback, useState, useEffect, FormEvent } from 'react';
import PetAvatar from '@/components/PetAvatar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getUserPets, createPet, updatePet, deletePet } from '@/lib/petService';
import { PET_TYPE_OPTIONS } from '@/lib/petOptions';
import { Pet, CreatePetData, PetType, PetSize } from '@/types/pet';

export default function PetsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<PetType>('dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState(0);
  const [size, setSize] = useState<PetSize>('medium');
  const [notes, setNotes] = useState('');
  const [behaviour, setBehaviour] = useState('');
  const [allergies, setAllergies] = useState('');
  const [vaccinationStatus, setVaccinationStatus] = useState('');
  const [friendlyWithDogs, setFriendlyWithDogs] = useState(false);
  const [friendlyWithCats, setFriendlyWithCats] = useState(false);
  const [friendlyWithChildren, setFriendlyWithChildren] = useState(false);
  const [medicationRequired, setMedicationRequired] = useState(false);
  const [specialCareInstructions, setSpecialCareInstructions] = useState('');
  const [emergencyVetContact, setEmergencyVetContact] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPets = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userPets = await getUserPets(user.uid);
      setPets(userPets);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t('We could not load your pets right now. Please try again. ', 'Lemmikkejäsi ei voitu ladata juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    void loadPets();
  }, [loadPets]);

  function handleAddNew() {
    setEditingPet(null);
    setName('');
    setType('dog');
    setBreed('');
    setAge(0);
    setSize('medium');
    setNotes('');
    setBehaviour('');
    setAllergies('');
    setVaccinationStatus('');
    setFriendlyWithDogs(false);
    setFriendlyWithCats(false);
    setFriendlyWithChildren(false);
    setMedicationRequired(false);
    setSpecialCareInstructions('');
    setEmergencyVetContact('');
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function handleEdit(pet: Pet) {
    setEditingPet(pet);
    setName(pet.name);
    setType(pet.type);
    setBreed(pet.breed);
    setAge(pet.age);
    setSize(pet.size);
    setNotes(pet.notes);
    setBehaviour(pet.behaviour || '');
    setAllergies(pet.allergies || '');
    setVaccinationStatus(pet.vaccinationStatus || '');
    setFriendlyWithDogs(pet.friendlyWithDogs);
    setFriendlyWithCats(pet.friendlyWithCats);
    setFriendlyWithChildren(pet.friendlyWithChildren);
    setMedicationRequired(pet.medicationRequired);
    setSpecialCareInstructions(pet.specialCareInstructions || '');
    setEmergencyVetContact(pet.emergencyVetContact || '');
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function handleCancel() {
    setShowForm(false);
    setEditingPet(null);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const petData: CreatePetData = {
        name,
        type,
        breed,
        age,
        size,
        notes,
        behaviour,
        allergies,
        vaccinationStatus,
        friendlyWithDogs,
        friendlyWithCats,
        friendlyWithChildren,
        medicationRequired,
        specialCareInstructions,
        emergencyVetContact,
      };

      if (editingPet) {
        await updatePet(user.uid, editingPet.id, petData);
        setSuccess(t('Pet saved.', 'Lemmikin tiedot tallennettu.'));
      } else {
        await createPet(user.uid, petData);
        setSuccess(t('Pet added.', 'Lemmikki lisätty.'));
      }

      setShowForm(false);
      setEditingPet(null);
      await loadPets();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t('We could not save this pet right now. Please check the fields and try again. ', 'Lemmikin tietoja ei voitu tallentaa. Tarkista kentät ja yritä uudelleen. ') + message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pet: Pet) {
    if (!user) return;
    if (!confirm(t(`Delete ${pet.name}? You will need to add this pet again before asking for care.`, `Poistetaanko ${pet.name}? Lemmikki on lisättävä uudelleen ennen uuden hoitopyynnön tekemistä.`))) return;

    setError('');
    setSuccess('');

    try {
      await deletePet(user.uid, pet.id);
      setSuccess(t(`${pet.name} deleted.`, `${pet.name} poistettu.`));
      await loadPets();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t('We could not delete this pet right now. Please try again. ', 'Lemmikkiä ei voitu poistaa juuri nyt. Yritä uudelleen. ') + message);
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#0f2640]">{t('My Pets', 'Lemmikkini')}</h1>
          {!showForm && (
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
            >
              {pets.length === 0 ? t('Add your first pet', 'Lisää ensimmäinen lemmikkisi') : t('Add pet', 'Lisää lemmikki')}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {showForm ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="mb-4 flex items-center gap-4">
              <PetAvatar
                name={name || t('Your pet', 'Lemmikkisi')}
                type={type}
                className="h-20 w-20 shrink-0 rounded-3xl border border-gray-200"
              />
              <div>
                <h2 className="text-xl font-bold text-[#0f2640]">
                  {editingPet ? t('Edit pet', 'Muokkaa lemmikkiä') : t('Add your pet', 'Lisää lemmikkisi')}
                </h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {t('The pet image updates automatically from the pet type.', 'Lemmikin kuva päivittyy automaattisesti eläinlajin mukaan.')}
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-[#6b7280]">
              {t('Add clear care details so sitters know how to help safely.', 'Lisää selkeät hoito-ohjeet, jotta hoitaja osaa huolehtia lemmikistä turvallisesti.')}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  {t('Pet name', 'Lemmikin nimi')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  {t('Pet type', 'Eläinlaji')}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PetType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                >
                  {PET_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {language === 'fi' ? ({ Dog: 'Koira', Cat: 'Kissa', Other: 'Muu' }[option.singularLabel] || option.singularLabel) : option.singularLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  {t('Breed', 'Rotu')}
                </label>
                <input
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  {t('Age (years)', 'Ikä (vuotta)')}
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  required
                  min="0"
                  max="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  {t('Size', 'Koko')}
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as PetSize)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                >
                  <option value="small">{t('Small', 'Pieni')}</option>
                  <option value="medium">{t('Medium', 'Keskikokoinen')}</option>
                  <option value="large">{t('Large', 'Suuri')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  {t('Notes for the sitter', 'Ohjeet hoitajalle')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  placeholder={t('Food, routine, behavior, or anything important.', 'Ruokailu, päivärytmi, käytös tai muu tärkeä tieto.')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    {t('Behaviour', 'Käytös')}
                  </label>
                  <input
                    type="text"
                    value={behaviour}
                    onChange={(e) => setBehaviour(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                    placeholder={t('Calm, active, anxious...', 'Rauhallinen, aktiivinen, arka...')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    {t('Allergies', 'Allergiat')}
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                    placeholder={t('Food or medication allergies', 'Ruoka- tai lääkeallergiat')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  {t('Vaccination status', 'Rokotustilanne')}
                </label>
                <input
                  type="text"
                  value={vaccinationStatus}
                  onChange={(e) => setVaccinationStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  placeholder={t('Up to date, partial, unknown...', 'Ajantasainen, osittainen, ei tiedossa...')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={friendlyWithDogs}
                    onChange={(e) => setFriendlyWithDogs(e.target.checked)}
                  />
                  {t('Friendly with dogs', 'Tulee toimeen koirien kanssa')}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={friendlyWithCats}
                    onChange={(e) => setFriendlyWithCats(e.target.checked)}
                  />
                  {t('Friendly with cats', 'Tulee toimeen kissojen kanssa')}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={friendlyWithChildren}
                    onChange={(e) => setFriendlyWithChildren(e.target.checked)}
                  />
                  {t('Friendly with children', 'Tulee toimeen lasten kanssa')}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={medicationRequired}
                    onChange={(e) => setMedicationRequired(e.target.checked)}
                  />
                  {t('Medication required', 'Tarvitsee lääkitystä')}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  {t('Special care instructions', 'Erityiset hoito-ohjeet')}
                </label>
                <textarea
                  value={specialCareInstructions}
                  onChange={(e) => setSpecialCareInstructions(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  placeholder={t('Handling, routines, sensitive triggers...', 'Käsittely, rutiinit, herkkyydet ja laukaisevat tilanteet...')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  {t('Emergency vet contact', 'Eläinlääkärin yhteystiedot hätätilanteessa')}
                </label>
                <input
                  type="text"
                  value={emergencyVetContact}
                  onChange={(e) => setEmergencyVetContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  placeholder={t('Phone/email/clinic', 'Puhelin, sähköposti tai klinikka')}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? t('Saving...', 'Tallennetaan...') : editingPet ? t('Save pet', 'Tallenna lemmikki') : t('Add pet', 'Lisää lemmikki')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 text-[#0f2640] rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('Cancel', 'Peruuta')}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">{t('Loading pets...', 'Ladataan lemmikkejä...')}</p>
          </div>
        ) : pets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">{t('You have not added any pets yet.', 'Et ole vielä lisännyt lemmikkejä.')}</p>
            <button
              onClick={handleAddNew}
              className="mt-4 px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
            >
              {t('Add your first pet', 'Lisää ensimmäinen lemmikkisi')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet) => (
              <div key={pet.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-4 flex items-start gap-4">
                  <PetAvatar
                    name={pet.name}
                    type={pet.type}
                    className="h-20 w-20 shrink-0 rounded-3xl border border-gray-200 shadow-sm"
                  />
                  <div className="min-w-0 pt-1">
                    <h3 className="break-words text-xl font-bold text-[#0f2640]">{pet.name}</h3>
                    <p className="mt-1 text-sm font-medium text-[#ff7a2d]">
                      {language === 'fi' ? ({ dog: 'Koira', cat: 'Kissa', bird: 'Lintu', fish: 'Kala', rabbit: 'Kani', reptile: 'Matelija', 'small-mammal': 'Piennisäkäs', other: 'Muu' }[pet.type] || pet.type) : pet.type.charAt(0).toUpperCase() + pet.type.slice(1).replace('-', ' ')}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-[#6b7280]">
                    <span className="font-medium">{t('Type:', 'Eläinlaji:')}</span>{' '}
                    {language === 'fi' ? ({ dog: 'Koira', cat: 'Kissa', bird: 'Lintu', fish: 'Kala', rabbit: 'Kani', reptile: 'Matelija', 'small-mammal': 'Piennisäkäs', other: 'Muu' }[pet.type] || pet.type) : pet.type.charAt(0).toUpperCase() + pet.type.slice(1)}
                  </p>
                  <p className="text-[#6b7280]">
                    <span className="font-medium">{t('Breed:', 'Rotu:')}</span> {pet.breed}
                  </p>
                  <p className="text-[#6b7280]">
                    <span className="font-medium">{t('Age:', 'Ikä:')}</span> {language === 'fi' ? `${pet.age} vuotta` : `${pet.age} year${pet.age !== 1 ? 's' : ''}`}
                  </p>
                  <p className="text-[#6b7280]">
                    <span className="font-medium">{t('Size:', 'Koko:')}</span>{' '}
                    {language === 'fi' ? ({ small: 'Pieni', medium: 'Keskikokoinen', large: 'Suuri' }[pet.size] || pet.size) : pet.size.charAt(0).toUpperCase() + pet.size.slice(1)}
                  </p>
                  {pet.notes && (
                    <p className="text-[#6b7280]">
                      <span className="font-medium">{t('Notes:', 'Ohjeet:')}</span> {pet.notes}
                    </p>
                  )}
                  {pet.behaviour && (
                    <p className="text-[#6b7280]">
                      <span className="font-medium">{t('Behaviour:', 'Käytös:')}</span> {pet.behaviour}
                    </p>
                  )}
                  {pet.allergies && (
                    <p className="text-[#6b7280]">
                      <span className="font-medium">{t('Allergies:', 'Allergiat:')}</span> {pet.allergies}
                    </p>
                  )}
                  {pet.vaccinationStatus && (
                    <p className="text-[#6b7280]">
                      <span className="font-medium">{t('Vaccination:', 'Rokotukset:')}</span> {pet.vaccinationStatus}
                    </p>
                  )}
                  <p className="text-[#6b7280]">
                    <span className="font-medium">{t('Friendly with:', 'Tulee toimeen:')}</span>{' '}
                    {[
                      pet.friendlyWithDogs ? t('dogs', 'koirien kanssa') : '',
                      pet.friendlyWithCats ? t('cats', 'kissojen kanssa') : '',
                      pet.friendlyWithChildren ? t('children', 'lasten kanssa') : '',
                    ]
                      .filter(Boolean)
                      .join(', ') || t('not specified', 'ei määritelty')}
                  </p>
                  <p className="text-[#6b7280]">
                    <span className="font-medium">{t('Medication:', 'Lääkitys:')}</span>{' '}
                    {pet.medicationRequired ? t('Required', 'Tarvitaan') : t('Not required', 'Ei tarvita')}
                  </p>
                  {pet.specialCareInstructions && (
                    <p className="text-[#6b7280]">
                      <span className="font-medium">{t('Special care:', 'Erityishoito:')}</span> {pet.specialCareInstructions}
                    </p>
                  )}
                  {pet.emergencyVetContact && (
                    <p className="text-[#6b7280]">
                      <span className="font-medium">{t('Emergency vet:', 'Eläinlääkäri hätätilanteessa:')}</span> {pet.emergencyVetContact}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(pet)}
                    className="px-3 py-1 text-sm border border-[#ff7a2d] text-[#ff7a2d] rounded hover:bg-[#ff7a2d] hover:text-white transition-colors"
                  >
                    {t('Edit', 'Muokkaa')}
                  </button>
                  <button
                    onClick={() => handleDelete(pet)}
                    className="px-3 py-1 text-sm border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                  >
                    {t('Delete', 'Poista')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
