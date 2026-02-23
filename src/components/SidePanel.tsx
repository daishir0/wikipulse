'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import { X, TrendingUp, Flame, BarChart3, Filter, Sparkles, Clock } from 'lucide-react';
import TrendRanking from './TrendRanking';
import EditBattle from './EditBattle';
import SessionStats from './SessionStats';
import { LANGUAGE_COLOR_MAP, LANGUAGE_NAMES, REGION_GROUPS } from '@/lib/constants';
import { extractLanguage } from '@/utils/geo';

type Tab = 'timeline' | 'trends' | 'battles' | 'stats' | 'filter' | 'new';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

export default function SidePanel({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('timeline');
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const stats = useStore((s) => s.stats);
  const newArticles = useStore((s) => s.newArticles);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const timelineHistory = useStore((s) => s.timelineHistory);
  const setPreviewArticle = useStore((s) => s.setPreviewArticle);

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'timeline', icon: <Clock className="w-4 h-4" />, label: 'Live' },
    { id: 'trends', icon: <TrendingUp className="w-4 h-4" />, label: 'Trend' },
    { id: 'battles', icon: <Flame className="w-4 h-4" />, label: 'Battle' },
    { id: 'new', icon: <Sparkles className="w-4 h-4" />, label: 'New' },
    { id: 'stats', icon: <BarChart3 className="w-4 h-4" />, label: 'Stats' },
    { id: 'filter', icon: <Filter className="w-4 h-4" />, label: 'Filter' },
  ];

  const toggleLanguage = (lang: string) => {
    const langs = filter.languages.includes(lang)
      ? filter.languages.filter((l) => l !== lang)
      : [...filter.languages, lang];
    setFilter({ languages: langs });
  };

  const selectRegion = (region: string) => {
    const langs = REGION_GROUPS[region];
    if (langs) setFilter({ languages: langs });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-sm border-l border-gray-700 z-30 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
          }`} />
          <span className="text-white text-sm font-bold">WikiPulse</span>
          <span className="text-gray-400 text-xs">
            {stats.totalEditsLastMinute} edits/min
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {tabs.map((t) => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              tab === t.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'timeline' && (
          <div>
            <h3 className="text-gray-400 text-xs uppercase mb-2">Live Timeline</h3>
            {timelineHistory.length === 0 ? (
              <div className="text-gray-500 text-sm p-2">Waiting for events...</div>
            ) : (
              <div className="space-y-0.5">
                {timelineHistory.map((entry) => {
                  const lang = extractLanguage(entry.wiki);
                  const color = LANGUAGE_COLOR_MAP[lang] || LANGUAGE_COLOR_MAP.default;
                  const isPositive = entry.byteDiff > 0;
                  const diffStr = entry.byteDiff >= 1000 || entry.byteDiff <= -1000
                    ? `${(entry.byteDiff / 1000).toFixed(1)}K`
                    : `${entry.byteDiff > 0 ? '+' : ''}${entry.byteDiff}`;

                  return (
                    <div key={entry.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer group"
                      onClick={() => setPreviewArticle({ wiki: entry.wiki, title: entry.title })}>
                      <span className="text-gray-600 text-[10px] w-7 text-right flex-shrink-0 font-mono">
                        {formatTimeAgo(entry.timestamp)}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      {entry.type === 'new' && (
                        <span className="text-[9px] px-1 rounded bg-yellow-500/20 text-yellow-400 flex-shrink-0">NEW</span>
                      )}
                      <span className="text-white text-[11px] truncate flex-1 group-hover:text-blue-300 transition-colors">
                        {entry.title}
                      </span>
                      <span className={`text-[10px] flex-shrink-0 font-mono ${
                        entry.type === 'new' ? 'text-yellow-400' :
                        isPositive ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {entry.type === 'new' ? '+' : diffStr}
                      </span>
                      {entry.bot && (
                        <span className="text-[9px] text-gray-600 flex-shrink-0">bot</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'trends' && (
          <div>
            <h3 className="text-gray-400 text-xs uppercase mb-2">Trending Articles (1h)</h3>
            <TrendRanking />
          </div>
        )}

        {tab === 'battles' && (
          <div>
            <h3 className="text-gray-400 text-xs uppercase mb-2">Edit Battles</h3>
            <EditBattle />
          </div>
        )}

        {tab === 'new' && (
          <div>
            <h3 className="text-gray-400 text-xs uppercase mb-2">New Articles (30 min)</h3>
            {newArticles.length === 0 ? (
              <div className="text-gray-500 text-sm p-2">No new articles yet...</div>
            ) : (
              <div className="space-y-1">
                {newArticles.map((article, i) => {
                  const lang = extractLanguage(article.wiki);
                  const color = LANGUAGE_COLOR_MAP[lang] || LANGUAGE_COLOR_MAP.default;
                  const ago = Math.round((Date.now() - article.time) / 60000);
                  return (
                    <div key={i}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer transition-colors"
                      onClick={() => setPreviewArticle({ wiki: article.wiki, title: article.title })}>
                      <Sparkles className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs truncate">{article.title}</div>
                        <div className="flex gap-1 text-[10px]">
                          <span style={{ color }}>{lang.toUpperCase()}</span>
                          <span className="text-gray-500">{ago}m ago</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div>
            <h3 className="text-gray-400 text-xs uppercase mb-2">Session Statistics</h3>
            <SessionStats />
          </div>
        )}

        {tab === 'filter' && (
          <div>
            <h3 className="text-gray-400 text-xs uppercase mb-2">Language Filter</h3>

            {/* Region buttons */}
            <div className="flex gap-1 mb-3 flex-wrap">
              <button onClick={() => setFilter({ languages: [] })}
                className={`px-2 py-1 text-xs rounded ${
                  filter.languages.length === 0 ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400'
                }`}>All</button>
              {Object.keys(REGION_GROUPS).map((region) => (
                <button key={region} onClick={() => selectRegion(region)}
                  className="px-2 py-1 text-xs rounded bg-white/10 text-gray-400 hover:bg-white/20">
                  {region}
                </button>
              ))}
            </div>

            {/* Language checkboxes with edit speed */}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {Object.entries(LANGUAGE_NAMES).map(([lang, name]) => {
                const color = LANGUAGE_COLOR_MAP[lang] || LANGUAGE_COLOR_MAP.default;
                const editsPerMin = stats.editsByLanguage[lang] || 0;
                const active = filter.languages.length === 0 || filter.languages.includes(lang);

                return (
                  <label key={lang} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleLanguage(lang)}
                      className="accent-blue-500"
                    />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-white text-xs flex-1">{name}</span>
                    {editsPerMin > 0 && (
                      <span className="text-gray-500 text-[10px]">{editsPerMin}/min</span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Bot filter */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filter.hideBots}
                  onChange={(e) => setFilter({ hideBots: e.target.checked })}
                  className="accent-blue-500"
                />
                <span className="text-white text-xs">Hide bot edits</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
