'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, extractLanguage } from '@/store';
import { LANGUAGE_NAMES } from '@/lib/constants';
import { EditEventWithMeta } from '@/lib/types';

interface TooltipData {
  event: EditEventWithMeta;
  x: number;
  y: number;
}

export default function GlobeTooltip() {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const editEvents = useStore((s) => s.editEvents);
  const globeCamera = useStore((s) => s.globeCamera);

  const findNearest = useCallback(() => {
    if (!globeCamera || editEvents.length === 0) {
      setTooltip(null);
      return;
    }

    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    let closest: EditEventWithMeta | null = null;
    let closestDist = 25; // max pixel distance to trigger tooltip

    for (const event of editEvents) {
      const pos = globeCamera.getScreenPosition(event.position.lat, event.position.lng, 0.01);
      if (!pos || !pos.visible) continue;
      const dx = pos.x - mx;
      const dy = pos.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = event;
      }
    }

    if (closest) {
      setTooltip({ event: closest, x: mx, y: my });
    } else {
      setTooltip(null);
    }
  }, [editEvents, globeCamera]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(findNearest);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [findNearest]);

  if (!tooltip) return null;

  const { event, x, y } = tooltip;
  const lang = extractLanguage(event.wiki);
  const langName = LANGUAGE_NAMES[lang] || lang;
  const byteDiff = event.lengthNew - event.lengthOld;
  const sign = byteDiff >= 0 ? '+' : '';

  return (
    <div
      className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg text-xs max-w-[280px]"
      style={{
        left: `${x + 14}px`,
        top: `${y - 10}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        border: `1px solid ${event.color}`,
        boxShadow: `0 0 8px ${event.color}40`,
      }}
    >
      <div className="font-semibold text-sm truncate" style={{ color: event.color }}>
        {event.title}
      </div>
      <div className="text-gray-300 mt-1 space-y-0.5">
        <div>{langName} Wikipedia · {event.bot ? 'Bot' : event.user}</div>
        <div>
          {event.type === 'new' ? '🆕 New article' : 'Edit'}{' '}
          <span style={{ color: byteDiff >= 0 ? '#4ade80' : '#f87171' }}>
            {sign}{byteDiff.toLocaleString()} bytes
          </span>
        </div>
      </div>
    </div>
  );
}
