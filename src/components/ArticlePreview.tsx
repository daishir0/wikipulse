'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { extractLanguage } from '@/utils/geo';
import { X, ExternalLink } from 'lucide-react';
import { ArticlePreview as ArticlePreviewType } from '@/lib/types';

export default function ArticlePreview() {
  const selectedEvent = useStore((s) => s.selectedEvent);
  const setSelectedEvent = useStore((s) => s.setSelectedEvent);
  const previewArticle = useStore((s) => s.previewArticle);
  const setPreviewArticle = useStore((s) => s.setPreviewArticle);
  const [preview, setPreview] = useState<ArticlePreviewType | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine what to preview: selectedEvent takes priority, then previewArticle
  const activeWiki = selectedEvent?.wiki || previewArticle?.wiki || null;
  const activeTitle = selectedEvent?.title || previewArticle?.title || null;

  useEffect(() => {
    if (!activeWiki || !activeTitle) {
      setPreview(null);
      return;
    }

    const lang = extractLanguage(activeWiki);
    setLoading(true);

    fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(activeTitle)}`)
      .then((r) => r.json())
      .then((data) => {
        setPreview({
          title: data.title || activeTitle,
          extract: data.extract || 'No summary available.',
          thumbnail: data.thumbnail?.source,
          url: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(activeTitle)}`,
          lang,
        });
      })
      .catch(() => {
        setPreview({
          title: activeTitle,
          extract: 'Failed to load preview.',
          url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(activeTitle)}`,
          lang,
        });
      })
      .finally(() => setLoading(false));
  }, [activeWiki, activeTitle]);

  const handleClose = () => {
    setSelectedEvent(null);
    setPreviewArticle(null);
  };

  if (!activeWiki || !activeTitle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full mx-4 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-white font-bold text-lg pr-4 leading-tight">
            {preview?.title || activeTitle}
          </h3>
          <button onClick={handleClose}
            className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400 py-8 text-center">Loading...</div>
        ) : preview ? (
          <>
            {preview.thumbnail && (
              <img src={preview.thumbnail} alt={preview.title}
                className="w-full h-40 object-cover rounded-lg mb-3" />
            )}
            <p className="text-gray-300 text-sm mb-3 line-clamp-4">{preview.extract}</p>
            {selectedEvent && (
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Editor: {selectedEvent.user}</span>
                <span>{selectedEvent.bot ? 'Bot' : 'Human'} edit</span>
                <span>{selectedEvent.type === 'new' ? 'New article' : `${selectedEvent.lengthNew - selectedEvent.lengthOld > 0 ? '+' : ''}${selectedEvent.lengthNew - selectedEvent.lengthOld} bytes`}</span>
              </div>
            )}
            <a href={preview.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
              <ExternalLink className="w-4 h-4" />
              Read on Wikipedia
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}
