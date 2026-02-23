'use client';

import { useStore } from '@/store';
import { VisualizationMode } from '@/lib/types';

export default function HeatmapToggle() {
  const vizMode = useStore((s) => s.vizMode);
  const setVizMode = useStore((s) => s.setVizMode);

  const modes: { value: VisualizationMode; label: string }[] = [
    { value: 'beam', label: 'Beam' },
    { value: 'heatmap', label: 'Heatmap' },
  ];

  return (
    <div className="flex rounded-lg overflow-hidden border border-white/20">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setVizMode(mode.value)}
          className={`px-3 py-1 text-xs transition-colors ${
            vizMode === mode.value
              ? 'bg-blue-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
