'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { extractLanguage } from '@/utils/geo';

const BOT_INTERVAL = 120000; // 2 minutes
const TYPING_SPEED = 35; // ms per character
const MAX_HISTORY = 3; // Keep 3 past comments visible

// Parse 《title》 markers into segments for colored rendering
function parseComment(text: string): { type: 'text' | 'title'; value: string }[] {
  const segments: { type: 'text' | 'title'; value: string }[] = [];
  const regex = /《([^》]+)》/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'title', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

// Extract the first 《title》 from a comment
function extractFirstTitle(text: string): string | null {
  const match = text.match(/《([^》]+)》/);
  return match ? match[1] : null;
}

// Render parsed segments with colored titles
function CommentText({ text }: { text: string }) {
  const segments = parseComment(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'title' ? (
          <span key={i} className="font-bold text-cyan-300">
            {seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </>
  );
}

// Google search link for a keyword
function SearchLink({ keyword }: { keyword: string }) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block mt-1.5 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
    >
      興味があったらこちら!
    </a>
  );
}

export default function WikiBot() {
  const botEnabled = useStore((s) => s.botEnabled);
  const [history, setHistory] = useState<string[]>([]); // Past comments (oldest first)
  const [currentComment, setCurrentComment] = useState('');
  const [commentVersion, setCommentVersion] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [typingDone, setTypingDone] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef(false);
  const currentCommentRef = useRef('');

  const fetchComment = useCallback(async () => {
    if (fetchingRef.current) {
      console.log('[WikiBot] fetchComment skipped: already fetching');
      return;
    }
    fetchingRef.current = true;

    const now = Date.now();
    const timelineHistory = useStore.getState().timelineHistory;
    const recentEdits = timelineHistory
      .filter((e) => now - e.timestamp < 120000)
      .map((e) => ({
        title: e.title,
        lang: extractLanguage(e.wiki),
        byteDiff: e.byteDiff,
        type: e.type,
        bot: e.bot,
      }));

    console.log(`[WikiBot] fetchComment: ${recentEdits.length} recent edits (${recentEdits.filter(e => !e.bot).length} human)`);

    if (recentEdits.length === 0) {
      fetchingRef.current = false;
      return;
    }

    setIsThinking(true);

    try {
      const res = await fetch('/api/bot-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits: recentEdits }),
      });
      const data = await res.json();

      console.log(`[WikiBot] API response: comment=${data.comment ? data.comment.slice(0, 50) + '...' : '(empty)'}, status=${res.status}`);

      if (data.comment) {
        const prev = currentCommentRef.current;
        console.log(`[WikiBot] New comment received. prev=${prev ? prev.slice(0, 30) + '...' : '(none)'}`);
        if (prev) {
          setHistory((h) => [...h, prev].slice(-MAX_HISTORY));
        }
        currentCommentRef.current = data.comment;
        setCurrentComment(data.comment);
        setCommentVersion((v) => v + 1); // Force typing restart even if text is same
        setIsThinking(false);
      } else {
        console.log('[WikiBot] API returned empty comment');
        setIsThinking(false);
      }
    } catch (err) {
      console.error('[WikiBot] Fetch error:', err);
      setIsThinking(false);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Typing animation for currentComment (commentVersion forces restart)
  useEffect(() => {
    if (!currentComment) return;

    console.log(`[WikiBot] Typing effect started for: ${currentComment.slice(0, 40)}... (v=${commentVersion})`);

    let index = 0;
    setDisplayedText('');
    setTypingDone(false);

    if (typingRef.current) clearTimeout(typingRef.current);

    const typeNext = () => {
      if (index < currentComment.length) {
        setDisplayedText(currentComment.slice(0, index + 1));
        index++;
        typingRef.current = setTimeout(typeNext, TYPING_SPEED);
      } else {
        setTypingDone(true);
      }
    };

    typingRef.current = setTimeout(typeNext, 300);

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [currentComment, commentVersion]);

  // Periodic fetch
  useEffect(() => {
    if (!botEnabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setHistory([]);
      setCurrentComment('');
      setCommentVersion(0);
      setDisplayedText('');
      setTypingDone(false);
      currentCommentRef.current = '';
      return;
    }

    const initialTimer = setTimeout(() => {
      fetchComment();
    }, 15000);

    intervalRef.current = setInterval(() => {
      fetchComment();
    }, BOT_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [botEnabled, fetchComment]);

  if (!botEnabled) return null;

  const hasContent = history.length > 0 || currentComment || isThinking;

  return (
    <div className="fixed bottom-6 left-6 z-20 flex items-end gap-3">
      {/* Character */}
      <div
        className={`relative flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-green-400 flex items-center justify-center shadow-lg shadow-blue-500/20 border-2 border-white/20 ${
          isThinking ? 'animate-bounce' : ''
        }`}
        style={{ animationDuration: '1.5s' }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <span className="text-2xl select-none">
            {isThinking ? '🤔' : '🌍'}
          </span>
        </div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[9px] text-white/60 bg-black/40 px-1.5 py-0.5 rounded-full">
            ウィキまる
          </span>
        </div>
      </div>

      {/* Speech bubbles stack */}
      {hasContent && (
        <div className="flex flex-col gap-2 max-w-sm">
          <div className="relative">
            {/* Past comments (older = more faded) */}
            {history.map((msg, idx) => {
              const age = history.length - idx;
              const opacity = age === 1 ? 0.55 : age === 2 ? 0.35 : 0.2;
              const title = extractFirstTitle(msg);
              return (
                <div
                  key={`h-${idx}-${msg.slice(0, 20)}`}
                  className="mb-2 bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-gray-600/30 shadow-lg transition-opacity duration-500"
                  style={{ opacity }}
                >
                  <p className="text-white text-xs leading-relaxed">
                    <CommentText text={msg} />
                  </p>
                  {title && <SearchLink keyword={title} />}
                </div>
              );
            })}

            {/* Current comment (typing animation) or thinking dots */}
            <div className="relative">
              <div className="absolute -left-2 bottom-3 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-800/90 border-b-8 border-b-transparent" />
              <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-600/50 shadow-xl">
                {isThinking ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : currentComment ? (
                  <>
                    <p className="text-white text-sm leading-relaxed">
                      <CommentText text={displayedText} />
                      {!typingDone && (
                        <span className="inline-block w-0.5 h-4 bg-white/70 animate-pulse ml-0.5 align-middle" />
                      )}
                    </p>
                    {typingDone && (() => {
                      const title = extractFirstTitle(currentComment);
                      return title ? <SearchLink keyword={title} /> : null;
                    })()}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
