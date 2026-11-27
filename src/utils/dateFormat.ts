const MONTHS_TR = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

export function formatShortDateTR(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const day = date.getDate();
  const month = MONTHS_TR[date.getMonth()];

  if (date.getFullYear() === now.getFullYear()) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${date.getFullYear()}`;
}

export function formatFullDateTR(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = MONTHS_TR[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${date.getFullYear()}, ${hours}:${mins}`;
}
