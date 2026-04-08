function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTimeLocalValue(date: Date): string {
  return `${formatDateInputValue(date)}T${formatTimeInputValue(date)}`;
}

export function buildFutureWindow(daysFromNow = 3, startHour = 9, durationHours = 2) {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

  return {
    start,
    end,
    startDate: formatDateInputValue(start),
    endDate: formatDateInputValue(end),
    startTime: formatTimeInputValue(start),
    endTime: formatTimeInputValue(end),
    startDateTimeLocal: formatDateTimeLocalValue(start),
    endDateTimeLocal: formatDateTimeLocalValue(end),
  };
}
