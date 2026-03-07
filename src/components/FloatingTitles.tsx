'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useStore } from '@/store';
import { extractLanguage } from '@/utils/geo';
import { LANGUAGE_SHORT_CODE, LANGUAGE_COORDINATES } from '@/lib/constants';
import { EditEventWithMeta } from '@/lib/types';

interface FloatingTitle {
  id: string;
  title: string;
  jaTitle: string | null;
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
  poeticMessage: string | null;
  event: EditEventWithMeta;
  langCode: string;
  // For burst titles: fixed screen position (bypass getScreenPosition)
  fixedScreenX?: number;
  fixedScreenY?: number;
}

function getPoeticMessage(type: string, byteDiff: number, isBot: boolean): string | null {
  if (isBot) return null;
  if (type === 'new') return 'someone added a new page to the world';
  if (byteDiff >= 500) return 'someone gifted knowledge';
  if (byteDiff < -200) return 'someone guarded accuracy';
  if (Math.abs(byteDiff) < 100) return 'someone made a small improvement';
  return null;
}

function getEditSizeColor(byteDiff: number, type: string, isBot: boolean): string {
  if (isBot) return '#6B7280';
  if (type === 'new') return '#FFD700';
  if (byteDiff >= 1000) return '#EF4444';
  if (byteDiff >= 500) return '#F97316';
  if (byteDiff >= 100) return '#3B82F6';
  if (byteDiff >= 0) return '#60A5FA';
  if (byteDiff < -200) return '#A855F7';
  return '#818CF8';
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * (180 / Math.PI);
}

const ANIMATION_DURATION = 12000;
const BURST_ANIMATION_DURATION = 20000;
const MAX_TITLES = 20;
const MAX_CONCURRENT_TRANSLATIONS = 1;
const TRANSLATION_INTERVAL_MS = 10000;
const MAX_CACHE_SIZE = 500;

const jaTranslationCache = new Map<string, string | null>();

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

function fetchJaTitle(wiki: string, title: string, id: string): Promise<string | null> {
  const cacheKey = `${wiki}:${title}`;
  if (jaTranslationCache.has(cacheKey)) return Promise.resolve(jaTranslationCache.get(cacheKey)!);

  const lang = wiki.replace('wiki', '');
  if (lang === 'ja') {
    jaTranslationCache.set(cacheKey, title);
    return Promise.resolve(title);
  }

  if (translationQueue.length >= 5) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    translationQueue.push({ wiki, title, id, resolve: (v) => {
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
  const focusBurst = useStore((s) => s.focusBurst);
  const hideBackside = useStore((s) => s.hideBackside);
  const setFocusBurst = useStore((s) => s.setFocusBurst);
  const timelineHistory = useStore((s) => s.timelineHistory);
  const pendingTranslations = useRef(new Set<string>());
  const lastSeenEventIdRef = useRef<string | null>(null);


  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  // Handle batch arrivals: process all new events since last seen
  useEffect(() => {
    if (editEvents.length === 0) return;

    const newEvents: EditEventWithMeta[] = [];
    for (const event of editEvents) {
      if (event.id === lastSeenEventIdRef.current) break;
      newEvents.push(event);
    }
    if (newEvents.length === 0) return;
    lastSeenEventIdRef.current = editEvents[0].id;

    const baseTime = Date.now();
    const newTitles: FloatingTitle[] = newEvents.map((latest, idx) => {
      const lang = extractLanguage(latest.wiki);
      const byteDiff = latest.lengthNew - latest.lengthOld;
      const color = getEditSizeColor(byteDiff, latest.type, latest.bot);

      return {
        id: latest.id,
        title: latest.title,
        jaTitle: lang === 'ja' ? latest.title : null,
        color,
        startTime: baseTime + idx * 40,
        lat: latest.position.lat,
        lng: latest.position.lng,
        altitude: 0.02,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: 8 + Math.random() * 15,
        isNew: latest.type === 'new',
        isMajor: byteDiff >= 500,
        isBot: latest.bot,
        byteDiff,
        poeticMessage: getPoeticMessage(latest.type, byteDiff, latest.bot),
        event: latest,
        langCode: LANGUAGE_SHORT_CODE[lang] || lang.toUpperCase(),
      };
    });

    setTitles((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const unique = newTitles.filter((t) => !existingIds.has(t.id));
      return [...unique, ...prev].slice(0, MAX_TITLES);
    });

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

  // Focus burst: when globe is clicked, show nearby edits
  // Only trigger on focusBurst changes (not timelineHistory) to avoid re-firing
  useEffect(() => {
    if (!focusBurst) return;

    const { lat: clickLat, lng: clickLng, screenX, screenY } = focusBurst;
    const snapshot = useStore.getState().timelineHistory;

    // Find the closest languages to the click point
    const langDistances = Object.entries(LANGUAGE_COORDINATES)
      .map(([lang, coords]) => ({
        lang,
        dist: haversineDistance(clickLat, clickLng, coords.lat, coords.lng),
      }))
      .sort((a, b) => a.dist - b.dist);

    // Prioritize 3 closest languages
    const primaryLangs = new Set(langDistances.slice(0, 3).map((l) => l.lang));
    const selected: typeof snapshot = [];

    for (const entry of snapshot) {
      const lang = extractLanguage(entry.wiki);
      if (primaryLangs.has(lang)) {
        selected.push(entry);
        if (selected.length >= 50) break;
      }
    }

    if (selected.length > 0) {
      const baseTime = Date.now();
      // Use SCREEN coordinates directly - bypass lat/lng→screen conversion
      const burstTitles: FloatingTitle[] = selected.map((entry, idx) => {
        const lang = extractLanguage(entry.wiki);
        const color = getEditSizeColor(entry.byteDiff, entry.type, entry.bot);
        const spread = 200; // pixels spread from click center

        return {
          id: `burst-${entry.id}-${idx}`,
          title: entry.title,
          jaTitle: null,
          color,
          startTime: baseTime + idx * 80,
          lat: clickLat,
          lng: clickLng,
          altitude: 0.02,
          driftAngle: Math.random() * Math.PI * 2,
          driftSpeed: 5 + Math.random() * 10,
          isNew: entry.type === 'new',
          isMajor: entry.byteDiff >= 500,
          isBot: entry.bot,
          byteDiff: entry.byteDiff,
          poeticMessage: null,
          event: {
            id: entry.id,
            title: entry.title,
            wiki: entry.wiki,
            user: entry.user,
            bot: entry.bot,
            type: entry.type,
            lengthOld: 0,
            lengthNew: entry.byteDiff,
            position: { lat: clickLat, lng: clickLng },
            color,
            size: 0.5,
            createdAt: baseTime,
          } as EditEventWithMeta,
          langCode: LANGUAGE_SHORT_CODE[lang] || lang.toUpperCase(),
          fixedScreenX: screenX + (Math.random() - 0.5) * spread,
          fixedScreenY: screenY + (Math.random() - 0.5) * spread,
        };
      });

      setTitles((prev) => [...burstTitles, ...prev].slice(0, MAX_TITLES + 50));
    }

    // Clear burst after 20 seconds
    const timer = setTimeout(() => {
      setFocusBurst(null);
    }, 20000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusBurst, setFocusBurst]);

  const handleClick = useCallback((event: EditEventWithMeta) => {
    setSelectedEvent(event);
  }, [setSelectedEvent]);

  const visibleTitles = useMemo(() => {
    if (!globeCamera) return [];
    return titles.map((title) => {
      const isBurst = title.fixedScreenX !== undefined;
      const duration = isBurst ? BURST_ANIMATION_DURATION : ANIMATION_DURATION;
      const elapsed = now - title.startTime;
      const progress = Math.min(elapsed / duration, 1);

      let x: number, y: number, visible: boolean;

      if (isBurst) {
        // Burst titles: use fixed screen coordinates from mouse click
        const driftDist = progress * title.driftSpeed * (duration / 1000);
        x = title.fixedScreenX! + Math.cos(title.driftAngle) * driftDist;
        y = title.fixedScreenY! + Math.sin(title.driftAngle) * driftDist;
        visible = true;
      } else {
        // Normal titles: project lat/lng through globe camera
        const screenPos = globeCamera.getScreenPosition(title.lat, title.lng, title.altitude);
        if (!screenPos) return null;
        const driftDist = progress * title.driftSpeed * (duration / 1000);
        x = screenPos.x + Math.cos(title.driftAngle) * driftDist;
        y = screenPos.y + Math.sin(title.driftAngle) * driftDist;
        visible = screenPos.visible;
      }

      let opacity = 1;
      if (progress < 0.1) opacity = progress / 0.1;
      else if (progress > 0.7) opacity = (1 - progress) / 0.3;
      if (!visible) {
        if (hideBackside) return null;
        opacity *= 0.3;
      }
      opacity = Math.max(opacity, 0.15);

      let scale = title.isNew ? 1.3 : title.isMajor ? 1.15 : title.isBot ? 0.85 : 1;

      return { ...title, x, y, opacity, scale, visible };
    }).filter((t): t is NonNullable<typeof t> => t !== null && t.opacity > 0.05);
  }, [titles, now, globeCamera, hideBackside]);

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
              textShadow: `0 0 3px black, 0 0 6px black, 0 0 10px ${title.color}, 0 0 20px ${title.color}`,
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
            <span className="ml-1 text-[10px] opacity-40 font-mono" style={{ color: title.color }}>
              ({title.langCode})
            </span>
            {title.poeticMessage && (
              <div className="text-[10px] italic opacity-60 mt-0.5" style={{ color: title.color }}>
                {title.poeticMessage}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
