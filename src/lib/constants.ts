import { GeoPosition, CameraPreset } from './types';

// Language to Color Mapping (20+ languages)
export const LANGUAGE_COLOR_MAP: Record<string, string> = {
  en: '#3B82F6',  // Blue
  ja: '#EF4444',  // Red
  zh: '#EAB308',  // Yellow
  de: '#10B981',  // Emerald
  fr: '#8B5CF6',  // Violet
  es: '#F97316',  // Orange
  pt: '#06B6D4',  // Cyan
  ru: '#EC4899',  // Pink
  it: '#14B8A6',  // Teal
  ko: '#F43F5E',  // Rose
  ar: '#A855F7',  // Purple
  hi: '#FB923C',  // Amber
  nl: '#2DD4BF',  // Teal light
  pl: '#E879F9',  // Fuchsia
  sv: '#60A5FA',  // Blue light
  vi: '#34D399',  // Green light
  uk: '#FBBF24',  // Yellow light
  cs: '#C084FC',  // Purple light
  id: '#4ADE80',  // Green
  th: '#F472B6',  // Pink light
  fa: '#818CF8',  // Indigo
  he: '#38BDF8',  // Sky
  tr: '#FB7185',  // Rose light
  default: '#FFFFFF',
};

// Bot edit color
export const BOT_COLOR = '#6B7280'; // Gray

// Language Names
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ja: '日本語', zh: '中文', de: 'Deutsch',
  fr: 'Français', es: 'Español', pt: 'Português', ru: 'Русский',
  it: 'Italiano', ko: '한국어', ar: 'العربية', hi: 'हिन्दी',
  nl: 'Nederlands', pl: 'Polski', sv: 'Svenska', vi: 'Tiếng Việt',
  uk: 'Українська', cs: 'Čeština', id: 'Bahasa Indonesia', th: 'ไทย',
  fa: 'فارسی', he: 'עברית', tr: 'Türkçe',
};

// Region Groups for language filter
export const REGION_GROUPS: Record<string, string[]> = {
  'Asia': ['ja', 'zh', 'ko', 'hi', 'vi', 'id', 'th', 'fa', 'he', 'ar', 'tr'],
  'Europe': ['en', 'de', 'fr', 'es', 'pt', 'ru', 'it', 'nl', 'pl', 'sv', 'uk', 'cs'],
  'Americas': ['en', 'es', 'pt'],
};

// Language to Coordinates Mapping
export const LANGUAGE_COORDINATES: Record<string, GeoPosition> = {
  en: { lat: 37.7749, lng: -122.4194 },
  ja: { lat: 35.6762, lng: 139.6503 },
  zh: { lat: 39.9042, lng: 116.4074 },
  de: { lat: 52.5200, lng: 13.4050 },
  fr: { lat: 48.8566, lng: 2.3522 },
  es: { lat: 40.4168, lng: -3.7038 },
  pt: { lat: -23.5505, lng: -46.6333 },
  ru: { lat: 55.7558, lng: 37.6173 },
  it: { lat: 41.9028, lng: 12.4964 },
  ko: { lat: 37.5665, lng: 126.9780 },
  ar: { lat: 24.7136, lng: 46.6753 },
  hi: { lat: 28.6139, lng: 77.2090 },
  nl: { lat: 52.3676, lng: 4.9041 },
  pl: { lat: 52.2297, lng: 21.0122 },
  sv: { lat: 59.3293, lng: 18.0686 },
  vi: { lat: 21.0285, lng: 105.8542 },
  uk: { lat: 50.4501, lng: 30.5234 },
  cs: { lat: 50.0755, lng: 14.4378 },
  id: { lat: -6.2088, lng: 106.8456 },
  th: { lat: 13.7563, lng: 100.5018 },
  fa: { lat: 35.6892, lng: 51.3890 },
  he: { lat: 31.7683, lng: 35.2137 },
  tr: { lat: 41.0082, lng: 28.9784 },
};

// Edit Size Mapping
export const EDIT_SIZE_MAP: Record<string, number> = {
  new: 1.0,
  major: 0.7,
  minor: 0.4,
};

// Camera Presets
export const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'global', label: '🌏 Global', lat: 20, lng: 0, altitude: 2.5 },
  { name: 'japan', label: '🇯🇵 Japan', lat: 36, lng: 138, altitude: 0.8 },
  { name: 'northAmerica', label: '🇺🇸 N.America', lat: 40, lng: -100, altitude: 1.2 },
  { name: 'europe', label: '🇪🇺 Europe', lat: 50, lng: 10, altitude: 1.0 },
  { name: 'asia', label: '🌏 Asia', lat: 30, lng: 105, altitude: 1.5 },
];

// Sound settings per language — all piano-like sine tones at different pitches
export const LANGUAGE_SOUND_MAP: Record<string, { type: OscillatorType; baseFreq: number }> = {
  en: { type: 'sine', baseFreq: 523 },   // C5
  ja: { type: 'sine', baseFreq: 587 },   // D5
  zh: { type: 'sine', baseFreq: 659 },   // E5
  de: { type: 'sine', baseFreq: 698 },   // F5
  fr: { type: 'sine', baseFreq: 784 },   // G5
  es: { type: 'sine', baseFreq: 880 },   // A5
  ru: { type: 'sine', baseFreq: 494 },   // B4
  ko: { type: 'sine', baseFreq: 440 },   // A4
  default: { type: 'sine', baseFreq: 523 },
};
