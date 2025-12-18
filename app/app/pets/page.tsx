'use client';

import { useState, useEffect, FormEvent } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPets, createPet, updatePet, deletePet } from '@/lib/petService';
import { Pet, CreatePetData, PetType, PetSize } from '@/types/pet';

export default function PetsPage() {
  const { user } = useAuth();
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPets();
  }, [user]);

  async function loadPets() {
    if (!user) return;

    try {
      setLoading(true);
      const userPets = await getUserPets(user.uid);
      setPets(userPets);
    } catch (err: any) {
      setError('Failed to load pets: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  function handleAddNew() {
    setEditingPet(null);
    setName('');
    setType('dog');
    setBreed('');
    setAge(0);
    setSize('medium');
    setNotes('');
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
      };

      if (editingPet) {
        await updatePet(user.uid, editingPet.id, petData);
        setSuccess('Pet updated successfully');
      } else {
        await createPet(user.uid, petData);
        setSuccess('Pet added successfully');
      }

      setShowForm(false);
      setEditingPet(null);
      await loadPets();
    } catch (err: any) {
      setError('Failed to save pet: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pet: Pet) {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete ${pet.name}?`)) return;

    setError('');
    setSuccess('');

    try {
      await deletePet(user.uid, pet.id);
      setSuccess(`${pet.name} deleted successfully`);
      await loadPets();
    } catch (err: any) {
      setError('Failed to delete pet: ' + (err.message || 'Unknown error'));
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#0f2640]">My Pets</h1>
          {!showForm && (
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
            >
              Add Pet
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
            <h2 className="text-xl font-bold text-[#0f2640] mb-4">
              {editingPet ? 'Edit Pet' : 'Add New Pet'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Name
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
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PetType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                >
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Breed
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
                  Age (years)
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
                  Size
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as PetSize)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  placeholder="Any special care instructions, temperament, etc."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingPet ? 'Update Pet' : 'Add Pet'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 text-[#0f2640] rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">Loading pets...</p>
          </div>
        ) : pets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">No pets yet. Click "Add Pet" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet) => (
              <div key={pet.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-[#0f2640] mb-2">{pet.name}</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-[#6b7280]">
                    <span className="font-medium">Type:</span>{' '}
                    {pet.type.charAt(0).toUpperCase() + pet.type.slice(1)}
                  </p>
                  <p className="text-[#6b7280]">
                    <span className="font-medium">Breed:</span> {pet.breed}
                  </p>
                  <p className="text-[#6b7280]">
                    <span className="font-medium">Age:</span> {pet.age} year{pet.age !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[#6b7280]">
                    <span className="font-medium">Size:</span>{' '}
                    {pet.size.charAt(0).toUpperCase() + pet.size.slice(1)}
                  </p>
                  {pet.notes && (
                    <p className="text-[#6b7280]">
                      <span className="font-medium">Notes:</span> {pet.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(pet)}
                    className="px-3 py-1 text-sm border border-[#ff7a2d] text-[#ff7a2d] rounded hover:bg-[#ff7a2d] hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pet)}
                    className="px-3 py-1 text-sm border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Delete
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
