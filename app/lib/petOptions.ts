import type { PetType } from '@/types/pet';

export const PET_TYPE_OPTIONS: ReadonlyArray<{
  value: PetType;
  singularLabel: string;
  pluralLabel: string;
}> = [
  { value: 'dog', singularLabel: 'Dog', pluralLabel: 'Dogs' },
  { value: 'cat', singularLabel: 'Cat', pluralLabel: 'Cats' },
  { value: 'rabbit', singularLabel: 'Rabbit', pluralLabel: 'Rabbits' },
  { value: 'bird', singularLabel: 'Bird', pluralLabel: 'Birds' },
  { value: 'small-mammal', singularLabel: 'Small mammal', pluralLabel: 'Small mammals' },
  { value: 'reptile', singularLabel: 'Reptile', pluralLabel: 'Reptiles' },
  { value: 'fish', singularLabel: 'Fish', pluralLabel: 'Fish' },
  { value: 'other', singularLabel: 'Other', pluralLabel: 'Other pets' },
];

export function getPetTypeLabel(value: string, plural = false): string {
  const option = PET_TYPE_OPTIONS.find((item) => item.value === value);
  if (option) {
    return plural ? option.pluralLabel : option.singularLabel;
  }

  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
