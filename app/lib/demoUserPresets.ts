import { ExperienceLevel, AvailabilityStatus } from '@/types/profile';
import { CreatePetData } from '@/types/pet';

export interface DemoWalletTransaction {
  id: string;
  type: string;
  amount: number;
  reference: string;
  balanceAfter: number;
}

export interface DemoAvailabilitySlotSeed {
  id: string;
  startAt: Date;
  endAt: Date;
}

export interface DemoPetSeed extends CreatePetData {
  id: string;
}

export interface DetailedDemoUser {
  email: string;
  name: string;
  location: string;
  country: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  availability: AvailabilityStatus;
  photoURL: string;
  bio: string;
  petExperience: string;
  petTypeExperience: string[];
  preferredPetSize: string[];
  experienceLevel: ExperienceLevel;
  experienceWithDogs: boolean;
  experienceWithCats: boolean;
  experienceWithLargeDogs: boolean;
  experienceWithSeniorPets: boolean;
  ratingAverage: number;
  ratingCount: number;
  trustScore: number;
  walletBalance: number;
  walletTransactions: DemoWalletTransaction[];
  availabilitySlots: DemoAvailabilitySlotSeed[];
  pets: DemoPetSeed[];
}

export const DEMO_USER_PASSWORD = 'test123';
export const LEGACY_DEMO_USER_PASSWORDS = ['PetBuddy123!'];

function hoursFromNow(baseTime: number, hoursAhead: number): Date {
  return new Date(baseTime + hoursAhead * 60 * 60 * 1000);
}

export function getDetailedDemoUsers(): DetailedDemoUser[] {
  const now = Date.now();

  return [
    {
      email: 'user1@gmail.com',
      name: 'Anna Virtanen',
      location: 'Helsinki',
      country: 'Finland',
      latitude: 60.1699,
      longitude: 24.9384,
      phoneNumber: '+358401111111',
      availability: 'unavailable',
      photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=AnnaVirtanen',
      bio: 'Warm and organized pet parent living near the Helsinki city center. I keep routines consistent and communicate clearly.',
      petExperience: 'I have cared for rescue dogs for years and I am comfortable with feeding schedules, leash manners, and medication reminders.',
      petTypeExperience: ['dog'],
      preferredPetSize: ['medium', 'large'],
      experienceLevel: 'intermediate',
      experienceWithDogs: true,
      experienceWithCats: false,
      experienceWithLargeDogs: true,
      experienceWithSeniorPets: false,
      ratingAverage: 4.8,
      ratingCount: 3,
      trustScore: 50,
      walletBalance: 18,
      walletTransactions: [
        { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
        { id: 'local-credits', type: 'earn', amount: 15, reference: 'Local testing credits', balanceAfter: 18 },
      ],
      availabilitySlots: [],
      pets: [
        {
          id: 'luna',
          name: 'Luna',
          type: 'dog',
          breed: 'Labrador Retriever',
          age: 4,
          size: 'large',
          notes: 'Loves long walks and settles quickly after exercise.',
          behaviour: 'Friendly and social',
          allergies: 'Chicken',
          vaccinationStatus: 'Up to date',
          friendlyWithDogs: true,
          friendlyWithCats: false,
          friendlyWithChildren: true,
          medicationRequired: false,
          specialCareInstructions: 'Use a front-clip harness for city walks.',
          emergencyVetContact: 'Helsinki Vet Center +358 10 123 4567',
        },
      ],
    },
    {
      email: 'user2@gmail.com',
      name: 'Mikko Laine',
      location: 'Espoo',
      country: 'Finland',
      latitude: 60.2055,
      longitude: 24.6559,
      phoneNumber: '+358402222222',
      availability: 'available',
      photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=MikkoLaine',
      bio: 'Calm remote worker with a predictable schedule and a quiet apartment. I prefer sitters who give regular updates.',
      petExperience: 'I have looked after cats for more than five years and I am used to shy pets who need gentle introductions.',
      petTypeExperience: ['cat'],
      preferredPetSize: ['small', 'medium'],
      experienceLevel: 'intermediate',
      experienceWithDogs: false,
      experienceWithCats: true,
      experienceWithLargeDogs: false,
      experienceWithSeniorPets: true,
      ratingAverage: 4.7,
      ratingCount: 2,
      trustScore: 50,
      walletBalance: 14,
      walletTransactions: [
        { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
        { id: 'local-credits', type: 'earn', amount: 11, reference: 'Local testing credits', balanceAfter: 14 },
      ],
      availabilitySlots: [
        { id: 'cat-care-morning', startAt: hoursFromNow(now, 16), endAt: hoursFromNow(now, 22) },
        { id: 'quiet-evening', startAt: hoursFromNow(now, 44), endAt: hoursFromNow(now, 52) },
      ],
      pets: [
        {
          id: 'nala',
          name: 'Nala',
          type: 'cat',
          breed: 'Domestic Shorthair',
          age: 2,
          size: 'small',
          notes: 'Indoor cat who loves puzzle feeders and sunny window spots.',
          behaviour: 'Curious but cautious with new people',
          allergies: '',
          vaccinationStatus: 'Up to date',
          friendlyWithDogs: false,
          friendlyWithCats: true,
          friendlyWithChildren: true,
          medicationRequired: false,
          specialCareInstructions: 'Keep the hallway door closed because she slips out quickly.',
          emergencyVetContact: 'Espoo Animal Clinic +358 20 987 6543',
        },
      ],
    },
    {
      email: 'user3@gmail.com',
      name: 'Sofia Niemi',
      location: 'Vantaa',
      country: 'Finland',
      latitude: 60.2934,
      longitude: 25.0378,
      phoneNumber: '+358403333333',
      availability: 'available',
      photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SofiaNiemi',
      bio: 'Active family household close to parks and walking routes. I value dependable sitters who are comfortable with mixed-pet homes.',
      petExperience: 'I handle both dogs and cats every day, including feeding routines, enrichment, and senior pet comfort care.',
      petTypeExperience: ['dog', 'cat'],
      preferredPetSize: ['small', 'medium', 'large'],
      experienceLevel: 'expert',
      experienceWithDogs: true,
      experienceWithCats: true,
      experienceWithLargeDogs: true,
      experienceWithSeniorPets: true,
      ratingAverage: 4.9,
      ratingCount: 4,
      trustScore: 50,
      walletBalance: 21,
      walletTransactions: [
        { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
        { id: 'local-credits', type: 'earn', amount: 18, reference: 'Local testing credits', balanceAfter: 21 },
      ],
      availabilitySlots: [
        { id: 'mixed-pets-day', startAt: hoursFromNow(now, 20), endAt: hoursFromNow(now, 32) },
        { id: 'senior-pet-weekend', startAt: hoursFromNow(now, 68), endAt: hoursFromNow(now, 82) },
      ],
      pets: [
        {
          id: 'bruno',
          name: 'Bruno',
          type: 'dog',
          breed: 'Golden Retriever',
          age: 6,
          size: 'large',
          notes: 'Gentle dog who enjoys playtime and short fetch sessions.',
          behaviour: 'Steady and affectionate',
          allergies: '',
          vaccinationStatus: 'Up to date',
          friendlyWithDogs: true,
          friendlyWithCats: true,
          friendlyWithChildren: true,
          medicationRequired: false,
          specialCareInstructions: 'Needs a towel by the door after rainy walks.',
          emergencyVetContact: 'Vantaa Pet Hospital +358 30 765 4321',
        },
        {
          id: 'mimi',
          name: 'Mimi',
          type: 'cat',
          breed: 'Ragdoll',
          age: 5,
          size: 'medium',
          notes: 'Prefers calm spaces and likes being brushed in the evening.',
          behaviour: 'Quiet and affectionate',
          allergies: 'Sensitive to strong perfumes',
          vaccinationStatus: 'Up to date',
          friendlyWithDogs: true,
          friendlyWithCats: true,
          friendlyWithChildren: true,
          medicationRequired: false,
          specialCareInstructions: 'Leave a night light on near the living room.',
          emergencyVetContact: 'Vantaa Pet Hospital +358 30 765 4321',
        },
      ],
    },
    {
      email: 'user4@gmail.com',
      name: 'Elina Koskinen',
      location: 'Helsinki',
      country: 'Finland',
      latitude: 60.1756,
      longitude: 24.9342,
      phoneNumber: '+358404444444',
      availability: 'available',
      photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ElinaKoskinen',
      bio: 'Experienced sitter with flexible weekday availability and a strong focus on calm, low-stress pet care.',
      petExperience: 'I have completed many dog walks, medication schedules, cat drop-ins, and overnight stays with senior pets.',
      petTypeExperience: ['dog', 'cat'],
      preferredPetSize: ['small', 'medium', 'large'],
      experienceLevel: 'expert',
      experienceWithDogs: true,
      experienceWithCats: true,
      experienceWithLargeDogs: true,
      experienceWithSeniorPets: true,
      ratingAverage: 5,
      ratingCount: 12,
      trustScore: 50,
      walletBalance: 24,
      walletTransactions: [
        { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
        { id: 'local-credits', type: 'earn', amount: 21, reference: 'Local testing credits', balanceAfter: 24 },
      ],
      availabilitySlots: [
        { id: 'weekday-morning', startAt: hoursFromNow(now, 18), endAt: hoursFromNow(now, 26) },
        { id: 'weekend-day', startAt: hoursFromNow(now, 48), endAt: hoursFromNow(now, 60) },
        { id: 'evening-dropin', startAt: hoursFromNow(now, 84), endAt: hoursFromNow(now, 92) },
      ],
      pets: [],
    },
    {
      email: 'user5@gmail.com',
      name: 'Joonas Saari',
      location: 'Espoo',
      country: 'Finland',
      latitude: 60.1841,
      longitude: 24.8276,
      phoneNumber: '+358405555555',
      availability: 'available',
      photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=JoonasSaari',
      bio: 'Reliable evening and weekend sitter who is especially good with shy cats and smaller dogs.',
      petExperience: 'I have supported several neighbors with cat sitting, puppy check-ins, and routine feeding visits.',
      petTypeExperience: ['dog', 'cat'],
      preferredPetSize: ['small', 'medium'],
      experienceLevel: 'intermediate',
      experienceWithDogs: true,
      experienceWithCats: true,
      experienceWithLargeDogs: false,
      experienceWithSeniorPets: true,
      ratingAverage: 4.4,
      ratingCount: 6,
      trustScore: 40,
      walletBalance: 16,
      walletTransactions: [
        { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
        { id: 'local-credits', type: 'earn', amount: 13, reference: 'Local testing credits', balanceAfter: 16 },
      ],
      availabilitySlots: [
        { id: 'after-work', startAt: hoursFromNow(now, 30), endAt: hoursFromNow(now, 36) },
        { id: 'weekend-evening', startAt: hoursFromNow(now, 72), endAt: hoursFromNow(now, 80) },
      ],
      pets: [],
    },
    {
      email: 'user6@gmail.com',
      name: 'Laura Maki',
      location: 'Vantaa',
      country: 'Finland',
      latitude: 60.3017,
      longitude: 25.039,
      phoneNumber: '+358406666666',
      availability: 'available',
      photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=LauraMaki',
      bio: 'Patient sitter who enjoys structured care plans and detailed updates for busy pet owners.',
      petExperience: 'I regularly handle large dogs, bonded cat pairs, and senior pets who need careful observation and medication logs.',
      petTypeExperience: ['dog', 'cat'],
      preferredPetSize: ['medium', 'large'],
      experienceLevel: 'expert',
      experienceWithDogs: true,
      experienceWithCats: true,
      experienceWithLargeDogs: true,
      experienceWithSeniorPets: true,
      ratingAverage: 4.9,
      ratingCount: 9,
      trustScore: 50,
      walletBalance: 27,
      walletTransactions: [
        { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
        { id: 'local-credits', type: 'earn', amount: 24, reference: 'Local testing credits', balanceAfter: 27 },
      ],
      availabilitySlots: [
        { id: 'long-stay', startAt: hoursFromNow(now, 24), endAt: hoursFromNow(now, 72) },
        { id: 'next-week', startAt: hoursFromNow(now, 120), endAt: hoursFromNow(now, 156) },
      ],
      pets: [],
    },
  ];
}
