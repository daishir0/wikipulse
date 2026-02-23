'use client';

import { useSound } from '@/hooks/useSound';
import { Volume2, VolumeX } from 'lucide-react';

export default function SoundControls() {
  const { sound, toggleSound, setVolume } = useSound();

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
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={sound.volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-20 h-1 accent-blue-500"
        />
      )}
    </div>
  );
}
