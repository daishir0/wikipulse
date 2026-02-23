'use client';

import { useStore } from '@/store';
import { extractLanguage } from '@/utils/geo';
import { LANGUAGE_COLOR_MAP, LANGUAGE_NAMES } from '@/lib/constants';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function TrendRanking() {
  const trendArticles = useStore((s) => s.trendArticles);
  const setPreviewArticle = useStore((s) => s.setPreviewArticle);

  if (trendArticles.length === 0) {
    return <div className="text-gray-500 text-sm p-2">Collecting data...</div>;
  }

  return (
    <div className="space-y-1">
      {trendArticles.map((article, index) => {
        const lang = extractLanguage(article.wiki);
        const color = LANGUAGE_COLOR_MAP[lang] || LANGUAGE_COLOR_MAP.default;
        const langName = LANGUAGE_NAMES[lang] || lang;
        const rankChange = article.previousRank !== null ? article.previousRank - index : null;

        return (
          <div key={`${article.wiki}:${article.title}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
            onClick={() => setPreviewArticle({ wiki: article.wiki, title: article.title })}>
            <span className="text-gray-500 text-xs w-5 text-right font-mono">{index + 1}</span>
            {rankChange !== null && rankChange > 0 && (
              <TrendingUp className="w-3 h-3 text-green-400" />
            )}
            {rankChange !== null && rankChange < 0 && (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            {(rankChange === null || rankChange === 0) && (
              <Minus className="w-3 h-3 text-gray-600" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs truncate">{article.title}</div>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="px-1 rounded" style={{ backgroundColor: color + '30', color }}>{langName}</span>
                <span className="text-gray-400">{article.editCount} edits</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
