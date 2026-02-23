'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useStore } from '@/store';
import { extractLanguage } from '@/utils/geo';
import { LANGUAGE_COLOR_MAP, BOT_COLOR } from '@/lib/constants';
import { EditEventWithMeta } from '@/lib/types';

interface FloatingTitle {
  id: string;
  title: string;
  jaTitle: string | null; // Japanese translation
  color: string;
  startTime: number;
  lat: number;
  lng: number;
  altitude: number;
  driftAngle: number;
  driftSpeed: number;
  isNew: boolean;
  isMajor: boolean;
  isBot: boolean;
  byteDiff: number;
  event: EditEventWithMeta;
}

const ANIMATION_DURATION = 5000;
const MAX_TITLES = 20;
const MAX_CONCURRENT_TRANSLATIONS = 1;
const TRANSLATION_INTERVAL_MS = 1000; // Min interval between API calls
const MAX_CACHE_SIZE = 500;

// Cache for Japanese title translations
const jaTranslationCache = new Map<string, string | null>();

// Translation queue system to avoid flooding Wikipedia API
const translationQueue: { wiki: string; title: string; id: string; resolve: (v: string | null) => void }[] = [];
let activeTranslations = 0;
let lastFetchTime = 0;

function processTranslationQueue() {
  while (activeTranslations < MAX_CONCURRENT_TRANSLATIONS && translationQueue.length > 0) {
    const item = translationQueue.shift();
    if (!item) break;

    const now = Date.now();
    const waitTime = Math.max(0, TRANSLATION_INTERVAL_MS - (now - lastFetchTime));

    activeTranslations++;
    setTimeout(() => {
      lastFetchTime = Date.now();
      doFetchJaTitle(item.wiki, item.title)
        .then(item.resolve)
        .finally(() => {
          activeTranslations--;
          processTranslationQueue();
        });
    }, waitTime);
  }
}

// Raw fetch (no queue)
async function doFetchJaTitle(wiki: string, title: string): Promise<string | null> {
  const lang = wiki.replace('wiki', '');
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=langlinks&lllang=ja&format=json&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages;
    if (pages) {
      const page = Object.values(pages)[0] as { langlinks?: { lang: string; '*': string }[] };
      if (page.langlinks && page.langlinks.length > 0) {
        return page.langlinks[0]['*'];
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Queued fetch with cache
function fetchJaTitle(wiki: string, title: string, id: string): Promise<string | null> {
  const cacheKey = `${wiki}:${title}`;
  if (jaTranslationCache.has(cacheKey)) return Promise.resolve(jaTranslationCache.get(cacheKey)!);

  const lang = wiki.replace('wiki', '');
  if (lang === 'ja') {
    jaTranslationCache.set(cacheKey, title);
    return Promise.resolve(title);
  }

  // Drop if queue is too long (older titles will expire before translation completes)
  if (translationQueue.length >= 5) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    translationQueue.push({ wiki, title, id, resolve: (v) => {
      // Evict oldest cache entries if too large
      if (jaTranslationCache.size >= MAX_CACHE_SIZE) {
        const firstKey = jaTranslationCache.keys().next().value;
        if (firstKey) jaTranslationCache.delete(firstKey);
      }
      jaTranslationCache.set(cacheKey, v);
      resolve(v);
    }});
    processTranslationQueue();
  });
}

export default function FloatingTitles() {
  const [titles, setTitles] = useState<FloatingTitle[]>([]);
  const [now, setNow] = useState(Date.now());
  const editEvents = useStore((s) => s.editEvents);
  const setSelectedEvent = useStore((s) => s.setSelectedEvent);
  const globeCamera = useStore((s) => s.globeCamera);
  const pendingTranslations = useRef(new Set<string>());
  const lastSeenEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  // Handle batch arrivals: process all new events since last seen
  useEffect(() => {
    if (editEvents.length === 0) return;

    // Find all new events (editEvents is newest-first)
    const newEvents: EditEventWithMeta[] = [];
    for (const event of editEvents) {
      if (event.id === lastSeenEventIdRef.current) break;
      newEvents.push(event);
    }
    if (newEvents.length === 0) return;
    lastSeenEventIdRef.current = editEvents[0].id;

    // Create floating titles for all new events (stagger startTime slightly)
    const baseTime = Date.now();
    const newTitles: FloatingTitle[] = newEvents.map((latest, idx) => {
      const lang = extractLanguage(latest.wiki);
      const color = latest.bot ? BOT_COLOR : (LANGUAGE_COLOR_MAP[lang] || LANGUAGE_COLOR_MAP.default);
      const byteDiff = latest.lengthNew - latest.lengthOld;

      return {
        id: latest.id,
        title: latest.title,
        jaTitle: lang === 'ja' ? latest.title : null,
        color,
        startTime: baseTime + idx * 40, // Stagger by 40ms per event in batch
        lat: latest.position.lat,
        lng: latest.position.lng,
        altitude: 0.02,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: 30 + Math.random() * 50,
        isNew: latest.type === 'new',
        isMajor: byteDiff >= 500,
        isBot: latest.bot,
        byteDiff,
        event: latest,
      };
    });

    setTitles((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const unique = newTitles.filter((t) => !existingIds.has(t.id));
      return [...unique, ...prev].slice(0, MAX_TITLES);
    });

    // Fetch Japanese translations for new non-ja titles (throttled)
    for (const latest of newEvents) {
      const lang = extractLanguage(latest.wiki);
      if (lang !== 'ja' && !pendingTranslations.current.has(latest.id)) {
        pendingTranslations.current.add(latest.id);
        fetchJaTitle(latest.wiki, latest.title, latest.id).then((jaTitle) => {
          if (jaTitle) {
            setTitles((prev) =>
              prev.map((t) => t.id === latest.id ? { ...t, jaTitle } : t)
            );
          }
          pendingTranslations.current.delete(latest.id);
        });
      }
    }
  }, [editEvents]);

  useEffect(() => {
    const cleanup = setInterval(() => {
      const t = Date.now();
      setTitles((prev) => prev.filter((title) => t - title.startTime < ANIMATION_DURATION));
    }, 500);
    return () => clearInterval(cleanup);
  }, []);

  const handleClick = useCallback((event: EditEventWithMeta) => {
    setSelectedEvent(event);
  }, [setSelectedEvent]);

  const visibleTitles = useMemo(() => {
    if (!globeCamera) return [];
    return titles.map((title) => {
      const elapsed = now - title.startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      const screenPos = globeCamera.getScreenPosition(title.lat, title.lng, title.altitude);
      if (!screenPos) return null;

      const driftDist = progress * title.driftSpeed * (ANIMATION_DURATION / 1000);
      const x = screenPos.x + Math.cos(title.driftAngle) * driftDist;
      const y = screenPos.y + Math.sin(title.driftAngle) * driftDist;

      let opacity = 1;
      if (progress < 0.1) opacity = progress / 0.1;
      else if (progress > 0.6) opacity = (1 - progress) / 0.4;
      if (!screenPos.visible) opacity *= 0.3;

      let scale = title.isNew ? 1.3 : title.isMajor ? 1.15 : title.isBot ? 0.85 : 1;

      return { ...title, x, y, opacity, scale, visible: screenPos.visible };
    }).filter((t): t is NonNullable<typeof t> => t !== null && t.opacity > 0.05);
  }, [titles, now, globeCamera]);

  if (!globeCamera) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {visibleTitles.map((title) => {
        const displayTitle = title.jaTitle || title.title;
        const showOriginal = title.jaTitle && title.jaTitle !== title.title;

        return (
          <div
            key={title.id}
            className="absolute whitespace-nowrap pointer-events-auto cursor-pointer hover:scale-110 transition-transform"
            onClick={() => handleClick(title.event)}
            style={{
              left: `${title.x}px`,
              top: `${title.y}px`,
              opacity: title.opacity,
              transform: `translate(-50%, -50%) scale(${title.scale})`,
              textShadow: `0 0 10px ${title.color}, 0 0 20px ${title.color}`,
            }}
          >
            {title.isNew && (
              <span className="mr-1 px-1.5 py-0.5 text-xs font-bold rounded animate-pulse"
                style={{ backgroundColor: title.color, color: 'black', boxShadow: `0 0 10px ${title.color}` }}>
                NEW
              </span>
            )}
            {!title.isNew && title.isMajor && (
              <span className="mr-1 px-1 py-0.5 text-xs font-bold rounded"
                style={{ backgroundColor: title.color, color: 'black' }}>
                +{title.byteDiff >= 1000 ? `${(title.byteDiff / 1000).toFixed(1)}K` : title.byteDiff}
              </span>
            )}
            <span className="text-sm font-medium" style={{ color: title.color }}>
              {displayTitle.length > 35 ? displayTitle.slice(0, 35) + '...' : displayTitle}
            </span>
            {showOriginal && (
              <span className="ml-1 text-[10px] opacity-50" style={{ color: title.color }}>
                ({title.title.length > 20 ? title.title.slice(0, 20) + '...' : title.title})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
