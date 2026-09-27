export const TEACHER_TIME_ZONE = 'Europe/Dublin';

export const STUDENT_TIME_ZONES = [
  { value: 'Europe/Dublin', label: 'İrlanda', offset: 'UTC+0 / UTC+1' },
  { value: 'Europe/Berlin', label: 'Almanya', offset: 'UTC+1 / UTC+2' },
  { value: 'Europe/Amsterdam', label: 'Hollanda', offset: 'UTC+1 / UTC+2' },
  { value: 'Europe/Istanbul', label: 'Türkiye', offset: 'UTC+3' },
  { value: 'Europe/London', label: 'Birleşik Krallık', offset: 'UTC+0 / UTC+1' },
  { value: 'America/Sao_Paulo', label: 'Brezilya – Brasília/São Paulo', offset: 'UTC−3' },
  { value: 'America/New_York', label: 'ABD – Doğu', offset: 'UTC−5 / UTC−4' },
  { value: 'America/Chicago', label: 'ABD – Merkez', offset: 'UTC−6 / UTC−5' },
  { value: 'America/Denver', label: 'ABD – Dağ', offset: 'UTC−7 / UTC−6' },
  { value: 'America/Los_Angeles', label: 'ABD – Batı', offset: 'UTC−8 / UTC−7' },
] as const;

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function zonedDateTimeToUtc(dateValue: string, timeValue: string, timeZone: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  const targetWallTime = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcGuess = targetWallTime;

  for (let pass = 0; pass < 3; pass += 1) {
    const parts = zonedParts(new Date(utcGuess), timeZone);
    const renderedWallTime = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    utcGuess -= renderedWallTime - targetWallTime;
  }

  return new Date(utcGuess);
}

export function addDaysToDateInput(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function timeZoneLabel(timeZone: string) {
  return STUDENT_TIME_ZONES.find((item) => item.value === timeZone)?.label || timeZone;
}

export function defaultTimeZoneForCountry(country?: string) {
  const normalized = (country || '').trim().toLocaleLowerCase('tr-TR');
  if (normalized === 'almanya') return 'Europe/Berlin';
  if (normalized === 'hollanda') return 'Europe/Amsterdam';
  if (normalized === 'irlanda') return 'Europe/Dublin';
  if (normalized === 'birleşik krallık' || normalized === 'ingiltere') return 'Europe/London';
  if (normalized === 'brezilya' || normalized === 'brasil') return 'America/Sao_Paulo';
  if (normalized === 'abd' || normalized === 'amerika') return 'America/New_York';
  return 'Europe/Istanbul';
}
