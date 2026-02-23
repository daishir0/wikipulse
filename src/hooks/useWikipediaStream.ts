'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { WikipediaEditEvent, RawEventStreamData } from '@/lib/types';

const EVENTSTREAMS_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const BACKOFF_MULTIPLIER = 2;
const HEARTBEAT_TIMEOUT = 15000; // If no event for 15s, force reconnect
const EVENT_FLUSH_INTERVAL = 300; // Flush batched events every 300ms

// Languages to throttle (process every Nth event)
const THROTTLED_WIKIS: Record<string, number> = {
  nlwiki: 2, // nl.wikipedia.org: process every 2nd event (half rate)
};

export function useWikipediaStream() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const throttleCountersRef = useRef<Record<string, number>>({});
  const eventQueueRef = useRef<WikipediaEditEvent[]>([]);

  const addEditEventsBatch = useStore((s) => s.addEditEventsBatch);
  const setConnectionStatus = useStore((s) => s.setConnectionStatus);
  const removeExpiredEvents = useStore((s) => s.removeExpiredEvents);

  // Flush event queue periodically (single batch → single Immer set())
  useEffect(() => {
    const interval = setInterval(() => {
      const queue = eventQueueRef.current;
      if (queue.length === 0) return;
      eventQueueRef.current = [];
      addEditEventsBatch(queue);
    }, EVENT_FLUSH_INTERVAL);
    return () => clearInterval(interval);
  }, [addEditEventsBatch]);

  useEffect(() => {
    const interval = setInterval(() => { removeExpiredEvents(); }, 2000);
    return () => clearInterval(interval);
  }, [removeExpiredEvents]);

  const parseEvent = useCallback((data: RawEventStreamData): WikipediaEditEvent | null => {
    if (data.type !== 'edit' && data.type !== 'new') return null;
    if (data.namespace !== 0) return null;
    if (!data.wiki.endsWith('wiki') || data.wiki.includes('wiktionary') ||
        data.wiki.includes('wikiquote') || data.wiki.includes('wikisource') ||
        data.wiki.includes('wikinews') || data.wiki.includes('wikiversity') ||
        data.wiki.includes('wikibooks') || data.wiki.includes('wikivoyage') ||
        data.wiki.includes('commons') || data.wiki.includes('wikidata') ||
        data.wiki.includes('mediawiki') || data.wiki.includes('meta')) {
      return null;
    }

    return {
      id: data.meta.id,
      wiki: data.wiki,
      title: data.title,
      type: data.type === 'new' ? 'new' : 'edit',
      user: data.user,
      timestamp: data.timestamp,
      lengthOld: data.length?.old || 0,
      lengthNew: data.length?.new || 0,
      minor: data.minor || false,
      bot: data.bot || false,
      comment: data.comment || '',
      serverUrl: data.server_url || '',
    };
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

    setConnectionStatus('connecting');

    const eventSource = new EventSource(EVENTSTREAMS_URL);
    eventSourceRef.current = eventSource;
    lastEventTimeRef.current = Date.now();

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      retryDelayRef.current = INITIAL_RETRY_DELAY;
      lastEventTimeRef.current = Date.now();
    };

    eventSource.onmessage = (event) => {
      lastEventTimeRef.current = Date.now(); // Update heartbeat timer
      try {
        const data: RawEventStreamData = JSON.parse(event.data);
        // Throttle specific wikis
        const wiki = data.wiki;
        if (wiki && THROTTLED_WIKIS[wiki]) {
          const n = THROTTLED_WIKIS[wiki];
          const count = (throttleCountersRef.current[wiki] || 0) + 1;
          throttleCountersRef.current[wiki] = count;
          if (count % n !== 0) return; // Skip this event
        }
        const editEvent = parseEvent(data);
        if (editEvent) eventQueueRef.current.push(editEvent); // Queue instead of immediate dispatch
      } catch { /* skip parse errors */ }
    };

    eventSource.onerror = () => {
      setConnectionStatus('error');
      eventSource.close();
      eventSourceRef.current = null;
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

      const delay = retryDelayRef.current;
      retryTimeoutRef.current = setTimeout(() => {
        retryDelayRef.current = Math.min(retryDelayRef.current * BACKOFF_MULTIPLIER, MAX_RETRY_DELAY);
        connect();
      }, delay);
    };

    // Heartbeat check: if no events for HEARTBEAT_TIMEOUT, force reconnect
    heartbeatIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastEventTimeRef.current;
      if (elapsed > HEARTBEAT_TIMEOUT && eventSourceRef.current) {
        console.log(`No events for ${elapsed}ms, forcing reconnect...`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnectionStatus('connecting');
        retryDelayRef.current = INITIAL_RETRY_DELAY;
        // Small delay before reconnect
        setTimeout(() => connect(), 500);
      }
    }, 5000);
  }, [addEditEventsBatch, setConnectionStatus, parseEvent]);

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) { clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = null; }
    if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null; }
    if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
    setConnectionStatus('disconnected');
  }, [setConnectionStatus]);

  useEffect(() => {
    connect();
    return () => { disconnect(); };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    connectionStatus: useStore((s) => s.connectionStatus),
  };
}
