'use client';

import { useStore } from '@/store';
import { extractLanguage } from '@/utils/geo';
import { LANGUAGE_COLOR_MAP } from '@/lib/constants';
import { Flame } from 'lucide-react';

export default function EditBattle() {
  const editBattles = useStore((s) => s.editBattles);
  const setPreviewArticle = useStore((s) => s.setPreviewArticle);

  if (editBattles.length === 0) {
    return <div className="text-gray-500 text-sm p-2">No edit battles detected</div>;
  }

  return (
    <div className="space-y-2">
      {editBattles.map((battle) => {
        const lang = extractLanguage(battle.wiki);
        const color = LANGUAGE_COLOR_MAP[lang] || LANGUAGE_COLOR_MAP.default;
        const intensity = Math.min(battle.editCount / 10, 1);

        return (
          <div key={battle.id}
            className="px-2 py-2 rounded border border-orange-500/30 cursor-pointer hover:border-orange-500/60 transition-colors"
            style={{ background: `rgba(255, 100, 50, ${intensity * 0.1})` }}
            onClick={() => setPreviewArticle({ wiki: battle.wiki, title: battle.title })}>
            <div className="flex items-center gap-1 mb-1">
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              <span className="text-orange-300 text-xs font-bold">EDIT BATTLE</span>
            </div>
            <div className="text-white text-xs truncate">{battle.title}</div>
            <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
              <span>{battle.editorCount} editors</span>
              <span>{battle.editCount} edits</span>
              <span style={{ color }}>{lang.toUpperCase()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
