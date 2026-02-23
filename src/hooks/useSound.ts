'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { extractLanguage } from '@/utils/geo';
import { playEditSound, resumeAudioContext } from '@/lib/sound';

export function useSound() {
  const sound = useStore((s) => s.sound);
  const editEvents = useStore((s) => s.editEvents);
  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sound.enabled || editEvents.length === 0) return;

    const latest = editEvents[0];
    if (latest.id === lastEventIdRef.current) return;
    lastEventIdRef.current = latest.id;

    const lang = extractLanguage(latest.wiki);
    const byteDiff = latest.lengthNew - latest.lengthOld;

    playEditSound(lang, byteDiff, latest.type === 'new', sound.volume);
  }, [editEvents, sound.enabled, sound.volume]);

  const toggleSound = () => {
    const newEnabled = !sound.enabled;
    if (newEnabled) resumeAudioContext();
    useStore.getState().setSound({ enabled: newEnabled });
  };

  const setVolume = (volume: number) => {
    useStore.getState().setSound({ volume });
  };

  return { sound, toggleSound, setVolume };
}
