export type SupportedCity = {
  name: string;
  latitude: number;
  longitude: number;
};

export const SUPPORTED_FINLAND_CITIES: readonly SupportedCity[] = [
  { name: 'Espoo', latitude: 60.2055, longitude: 24.6559 },
  { name: 'Helsinki', latitude: 60.1699, longitude: 24.9384 },
  { name: 'Hyvinkää', latitude: 60.633, longitude: 24.864 },
  { name: 'Hämeenlinna', latitude: 60.9959, longitude: 24.4643 },
  { name: 'Joensuu', latitude: 62.601, longitude: 29.7636 },
  { name: 'Jyväskylä', latitude: 62.2426, longitude: 25.7473 },
  { name: 'Järvenpää', latitude: 60.4737, longitude: 25.0899 },
  { name: 'Kajaani', latitude: 64.2273, longitude: 27.7285 },
  { name: 'Kirkkonummi', latitude: 60.1238, longitude: 24.4385 },
  { name: 'Kokkola', latitude: 63.8385, longitude: 23.1307 },
  { name: 'Kotka', latitude: 60.4664, longitude: 26.9458 },
  { name: 'Kouvola', latitude: 60.8681, longitude: 26.7042 },
  { name: 'Kuopio', latitude: 62.8924, longitude: 27.6782 },
  { name: 'Lahti', latitude: 60.9827, longitude: 25.6615 },
  { name: 'Lappeenranta', latitude: 61.0549, longitude: 28.1897 },
  { name: 'Lohja', latitude: 60.2486, longitude: 24.0653 },
  { name: 'Mikkeli', latitude: 61.687, longitude: 27.2736 },
  { name: 'Nurmijärvi', latitude: 60.4642, longitude: 24.807 },
  { name: 'Oulu', latitude: 65.0121, longitude: 25.4651 },
  { name: 'Pori', latitude: 61.4851, longitude: 21.7974 },
  { name: 'Porvoo', latitude: 60.3923, longitude: 25.6651 },
  { name: 'Rauma', latitude: 61.1272, longitude: 21.5113 },
  { name: 'Rovaniemi', latitude: 66.5039, longitude: 25.7294 },
  { name: 'Salo', latitude: 60.3833, longitude: 23.1333 },
  { name: 'Seinäjoki', latitude: 62.7903, longitude: 22.8403 },
  { name: 'Tampere', latitude: 61.4978, longitude: 23.761 },
  { name: 'Turku', latitude: 60.4518, longitude: 22.2666 },
  { name: 'Tuusula', latitude: 60.4037, longitude: 25.0264 },
  { name: 'Vaasa', latitude: 63.0951, longitude: 21.6165 },
  { name: 'Vantaa', latitude: 60.2934, longitude: 25.0378 },
];

function normalizeCityName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function findSupportedCity(value: string): SupportedCity | undefined {
  const normalizedValue = normalizeCityName(value);
  return SUPPORTED_FINLAND_CITIES.find(
    (city) => normalizeCityName(city.name) === normalizedValue
  );
}

export function getCityLocationPayload(value: string): {
  location: string;
  country: 'Finland';
  latitude: number;
  longitude: number;
} | null {
  const city = findSupportedCity(value);
  if (!city) {
    return null;
  }

  return {
    location: city.name,
    country: 'Finland',
    latitude: city.latitude,
    longitude: city.longitude,
  };
}
