'use client';

import { useSound } from '@/hooks/useSound';
import { useStore } from '@/store';
import { Volume2, VolumeX } from 'lucide-react';
import { SoundPreset } from '@/lib/types';

const PRESET_OPTIONS: { value: SoundPreset; label: string }[] = [
  { value: 'chord', label: 'Chord' },
  { value: 'piano', label: 'Piano' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'rand', label: 'Rand' },
];

export default function SoundControls() {
  const { sound, toggleSound, setVolume, activeRandPreset } = useSound();
  const setSound = useStore((s) => s.setSound);
  const isRand = sound.preset === 'rand';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleSound}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        title={sound.enabled ? 'Mute' : 'Unmute'}
      >
        {sound.enabled ? (
          <Volume2 className="w-5 h-5 text-white" />
        ) : (
          <VolumeX className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {sound.enabled && (
        <>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sound.volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 accent-blue-500"
          />
          <div className="flex gap-0.5">
            {PRESET_OPTIONS.map((opt) => {
              const isSelected = sound.preset === opt.value;
              const isRandActive = isRand && opt.value === activeRandPreset;

              return (
                <button
                  key={opt.value}
                  onClick={() => setSound({ preset: opt.value })}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${
                    isSelected
                      ? 'bg-blue-600/70 text-white'
                      : isRandActive
                        ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500/50'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                  }`}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
