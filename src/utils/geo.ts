import { GeoPosition } from '@/lib/types';
import { LANGUAGE_COORDINATES } from '@/lib/constants';

// Extract language code from wiki name (e.g., "enwiki" -> "en")
export function extractLanguage(wiki: string): string {
  const match = wiki.match(/^([a-z]+)wiki$/);
  return match ? match[1] : 'unknown';
}

// Get coordinates for language with random offset
export function getPositionForLanguage(wiki: string): GeoPosition {
  const lang = extractLanguage(wiki);
  const basePosition = LANGUAGE_COORDINATES[lang];

  if (basePosition) {
    return {
      lat: basePosition.lat + (Math.random() - 0.5) * 10,
      lng: basePosition.lng + (Math.random() - 0.5) * 10,
    };
  }

  return {
    lat: (Math.random() - 0.5) * 120,
    lng: (Math.random() - 0.5) * 360,
  };
}

// Calculate sun position for day/night
export function getSunPosition(): GeoPosition {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const hourUTC = now.getUTCHours() + now.getUTCMinutes() / 60;

  // Solar declination (approximate)
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));

  // Sub-solar longitude
  const lng = -((hourUTC - 12) * 15);

  return { lat: declination, lng };
}
