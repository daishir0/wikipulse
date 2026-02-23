'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { LANGUAGE_NAMES } from '@/lib/constants';

export default function SessionStats() {
  const sessionStats = useStore((s) => s.sessionStats);
  const stats = useStore((s) => s.stats);
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - sessionStats.startTime;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStats.startTime]);

  const humanPct = sessionStats.totalEdits > 0
    ? Math.round((sessionStats.humanEdits / sessionStats.totalEdits) * 100)
    : 0;
  const botPct = 100 - humanPct;
  const langName = LANGUAGE_NAMES[sessionStats.mostActiveLanguage] || sessionStats.mostActiveLanguage || '-';

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400">Elapsed</div>
          <div className="text-white font-mono text-sm">{elapsed}</div>
        </div>
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400">Total Edits</div>
          <div className="text-white font-mono text-sm">{sessionStats.totalEdits.toLocaleString()}</div>
        </div>
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400">New Articles</div>
          <div className="text-green-400 font-mono text-sm">{sessionStats.totalNewArticles}</div>
        </div>
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400">Most Active</div>
          <div className="text-blue-400 text-sm truncate">{langName}</div>
        </div>
      </div>

      {/* Human vs Bot ratio bar */}
      <div>
        <div className="text-gray-400 mb-1">Human vs Bot</div>
        <div className="flex h-4 rounded overflow-hidden">
          <div className="bg-blue-500 flex items-center justify-center text-[10px] text-white"
            style={{ width: `${humanPct}%` }}>
            {humanPct > 10 && `${humanPct}%`}
          </div>
          <div className="bg-purple-500 flex items-center justify-center text-[10px] text-white"
            style={{ width: `${botPct}%` }}>
            {botPct > 10 && `${botPct}%`}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
          <span>Human: {sessionStats.humanEdits}</span>
          <span>Bot: {sessionStats.botEdits}</span>
        </div>
      </div>

      {/* Mini chart */}
      {stats.editHistory.length > 2 && (
        <div>
          <div className="text-gray-400 mb-1">Edits/10s (last 5 min)</div>
          <div className="flex items-end gap-px h-12">
            {stats.editHistory.slice(-30).map((count, i) => {
              const max = Math.max(...stats.editHistory.slice(-30), 1);
              const h = (count / max) * 100;
              return (
                <div key={i} className="flex-1 bg-blue-500/60 rounded-t"
                  style={{ height: `${h}%` }} />
              );
            })}
          </div>
        </div>
      )}

      {sessionStats.mostEditedArticle && (
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400">Most Edited</div>
          <div className="text-white text-xs truncate">{sessionStats.mostEditedArticle}</div>
        </div>
      )}
    </div>
  );
}
