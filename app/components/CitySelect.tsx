'use client';

import { findSupportedCity, SUPPORTED_FINLAND_CITIES } from '@/lib/locations';

type CitySelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  emptyLabel?: string;
  required?: boolean;
};

export default function CitySelect({
  value,
  onChange,
  className = '',
  emptyLabel = 'Select a city',
  required = false,
}: CitySelectProps) {
  const unsupportedCurrentValue = value.trim() && !findSupportedCity(value);

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      autoComplete="address-level2"
      className={className}
    >
      <option value="">{emptyLabel}</option>
      {unsupportedCurrentValue && (
        <option value={value} disabled>
          {value} (choose a supported city)
        </option>
      )}
      {SUPPORTED_FINLAND_CITIES.map((city) => (
        <option key={city.name} value={city.name}>
          {city.name}
        </option>
      ))}
    </select>
  );
}
