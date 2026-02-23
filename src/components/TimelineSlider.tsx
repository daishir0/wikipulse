'use client';

import { useStore } from '@/store';
import { Radio } from 'lucide-react';

export default function TimelineSlider() {
  const playbackState = useStore((s) => s.playbackState);
  const setPlaybackState = useStore((s) => s.setPlaybackState);
  const connectionStatus = useStore((s) => s.connectionStatus);

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
        playbackState === 'live'
          ? 'bg-red-600 text-white animate-pulse'
          : 'bg-yellow-600 text-white'
      }`}>
        <Radio className="w-3 h-3" />
        {playbackState === 'live' ? 'LIVE' : 'REPLAY'}
      </div>
      {playbackState !== 'live' && (
        <button
          onClick={() => setPlaybackState('live')}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
        >
          Go Live
        </button>
      )}
      <div className={`w-2 h-2 rounded-full ${
        connectionStatus === 'connected' ? 'bg-green-400' :
        connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
      }`} />
    </div>
  );
}
