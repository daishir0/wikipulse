'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store';
import { extractLanguage } from '@/utils/geo';
import { playEditSound, resumeAudioContext } from '@/lib/sound';
import { SoundPreset } from '@/lib/types';

const RAND_PRESETS: SoundPreset[] = ['chord', 'piano', 'ambient', 'minimal'];
const RAND_INTERVAL = 15000;

export function useSound() {
  const sound = useStore((s) => s.sound);
  const editEvents = useStore((s) => s.editEvents);
  const lastEventIdRef = useRef<string | null>(null);
  const [activeRandPreset, setActiveRandPreset] = useState<SoundPreset>(
    RAND_PRESETS[Math.floor(Math.random() * RAND_PRESETS.length)]
  );

  // Rotate rand preset every 15 seconds
  useEffect(() => {
    if (sound.preset !== 'rand') return;
    const interval = setInterval(() => {
      setActiveRandPreset((current) => {
        const others = RAND_PRESETS.filter((p) => p !== current);
        return others[Math.floor(Math.random() * others.length)];
      });
    }, RAND_INTERVAL);
    return () => clearInterval(interval);
  }, [sound.preset]);

  useEffect(() => {
    if (!sound.enabled || editEvents.length === 0) return;

    const latest = editEvents[0];
    if (latest.id === lastEventIdRef.current) return;
    lastEventIdRef.current = latest.id;

    const lang = extractLanguage(latest.wiki);
    const byteDiff = latest.lengthNew - latest.lengthOld;
    const preset = sound.preset === 'rand' ? activeRandPreset : sound.preset;

    playEditSound(lang, byteDiff, latest.type === 'new', sound.volume, preset);
  }, [editEvents, sound.enabled, sound.volume, sound.preset, activeRandPreset]);

  const toggleSound = () => {
    const newEnabled = !sound.enabled;
    if (newEnabled) resumeAudioContext();
    useStore.getState().setSound({ enabled: newEnabled });
  };

  const setVolume = (volume: number) => {
    useStore.getState().setSound({ volume });
  };

  return { sound, toggleSound, setVolume, activeRandPreset };
}
