'use client';

import { useCallback } from 'react';
import { CAMERA_PRESETS } from '@/lib/constants';
import { useStore } from '@/store';
import type { GlobeMethods } from 'react-globe.gl';

interface Props {
  globeRef: React.RefObject<GlobeMethods | undefined>;
}

export default function CameraPresets({ globeRef }: Props) {
  const autoRotate = useStore((s) => s.autoRotate);
  const setAutoRotate = useStore((s) => s.setAutoRotate);

  const flyTo = useCallback((lat: number, lng: number, altitude: number) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng, altitude }, 1000);
    }
  }, [globeRef]);

  return (
    <div className="flex flex-col gap-1">
      {CAMERA_PRESETS.map((preset) => (
        <button
          key={preset.name}
          onClick={() => flyTo(preset.lat, preset.lng, preset.altitude)}
          className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white transition-colors whitespace-nowrap"
        >
          {preset.label}
        </button>
      ))}
      <button
        onClick={() => setAutoRotate(!autoRotate)}
        className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap ${
          autoRotate ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
        }`}
      >
        {autoRotate ? '🔄 Auto ON' : '⏸ Auto OFF'}
      </button>
    </div>
  );
}
