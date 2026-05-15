import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const VIBE_TO_SEARCH: Record<string, string> = {
  culture:       'museum',
  food:          'tapas',
  entertainment: 'flamenco',
  sports:        'bike',
  nature:        'park',
  nightlife:     'bar',
  shopping:      'shopping',
  wellness:      'spa',
  adventure:     'hiking',
  history:       'history',
};

export function vibestoSearchTerm(vibes?: string[]): string {
  if (!vibes || vibes.length === 0) return 'tour';
  const terms = vibes.map(v => VIBE_TO_SEARCH[v]).filter(Boolean);
  return terms.length > 0 ? terms[0] : 'tour';
}

/** Rotate array by offset so different days show different items */
export function rotateArray<T>(arr: T[], offset: number): T[] {
  if (arr.length === 0) return arr;
  const n = arr.length;
  const start = ((offset % n) + n) % n;
  return [...arr.slice(start), ...arr.slice(0, start)];
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatShortDate(dateString: string | Date): string {
  const d = new Date(dateString);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
