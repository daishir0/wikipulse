import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  WikipediaEditEvent,
  EditEventWithMeta,
  ConnectionStatus,
  FilterState,
  StatsData,
  Milestone,
  GlobeCamera,
  VisualizationMode,
  PlaybackState,
  SoundSettings,
  TrendArticle,
  EditBattle,
  SessionStatsData,
  ArticlePreview,
  EditSizeCategory,
  TimelineEntry,
} from '@/lib/types';
import { LANGUAGE_COLOR_MAP, BOT_COLOR, EDIT_SIZE_MAP } from '@/lib/constants';
import { extractLanguage, getPositionForLanguage } from '@/utils/geo';

const MAX_EVENTS = 100;
const EVENT_TTL_MS = 5000;

function getColorForLanguage(wiki: string, isBot: boolean = false): string {
  if (isBot) return BOT_COLOR;
  const lang = extractLanguage(wiki);
  return LANGUAGE_COLOR_MAP[lang] || LANGUAGE_COLOR_MAP.default;
}

function getEditSizeCategory(event: WikipediaEditEvent): EditSizeCategory {
  if (event.type === 'new') return 'new';
  const diff = Math.abs(event.lengthNew - event.lengthOld);
  if (diff >= 500) return 'major';
  return 'minor';
}

function getSizeForEdit(event: WikipediaEditEvent): number {
  return EDIT_SIZE_MAP[getEditSizeCategory(event)];
}

interface GlobalState {
  // Edit events
  editEvents: EditEventWithMeta[];
  addEditEvent: (event: WikipediaEditEvent) => void;
  addEditEventsBatch: (events: WikipediaEditEvent[]) => void;
  removeExpiredEvents: () => void;

  // Selected event
  selectedEvent: EditEventWithMeta | null;
  setSelectedEvent: (event: EditEventWithMeta | null) => void;

  // Article preview
  articlePreview: ArticlePreview | null;
  setArticlePreview: (preview: ArticlePreview | null) => void;

  // Statistics
  stats: StatsData;

  // Filter
  filter: FilterState;
  setFilter: (filter: Partial<FilterState>) => void;

  // Connection
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Globe camera
  globeCamera: GlobeCamera | null;
  setGlobeCamera: (camera: GlobeCamera | null) => void;

  // Visualization mode
  vizMode: VisualizationMode;
  setVizMode: (mode: VisualizationMode) => void;

  // Sound
  sound: SoundSettings;
  setSound: (settings: Partial<SoundSettings>) => void;

  // Playback
  playbackState: PlaybackState;
  setPlaybackState: (state: PlaybackState) => void;

  // Auto-rotate
  autoRotate: boolean;
  setAutoRotate: (value: boolean) => void;

  // Tutorial
  showTutorial: boolean;
  setShowTutorial: (value: boolean) => void;

  // Fullscreen
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;

  // Day/Night lighting
  dayNightEnabled: boolean;
  setDayNightEnabled: (value: boolean) => void;

  // Trend ranking
  trendArticles: TrendArticle[];

  // Edit battles
  editBattles: EditBattle[];

  // New articles (last 30 min)
  newArticles: { title: string; wiki: string; time: number }[];

  // Session stats
  sessionStats: SessionStatsData;

  // Internal tracking
  recentEditsForStats: { timestamp: number; wiki: string; title: string; bot: boolean; type: string; byteDiff: number }[];
  editHistoryBuckets: { timestamp: number; count: number }[];
  totalEditsEver: number;

  // For trend/battle tracking (1 hour of data)
  articleEditHistory: Record<string, { count: number; lastEdit: number; wiki: string; editors: Set<string>; byteChanges: number[]; lat: number; lng: number }>;

  // Heatmap data (5 min edit density by region)
  heatmapData: { lat: number; lng: number; weight: number }[];

  // Timeline history (for sidebar)
  timelineHistory: TimelineEntry[];

  // Preview article (from sidebar clicks)
  previewArticle: { wiki: string; title: string } | null;
  setPreviewArticle: (article: { wiki: string; title: string } | null) => void;

  // WikiBot
  botEnabled: boolean;
  setBotEnabled: (value: boolean) => void;
}

export const useStore = create<GlobalState>()(
  immer((set, get) => ({
    editEvents: [],
    selectedEvent: null,
    articlePreview: null,
    stats: {
      totalEditsLastMinute: 0,
      editsByLanguage: {},
      recentTitles: [],
      botEdits: 0,
      humanEdits: 0,
      mostActiveLanguage: '',
      editHistory: [],
      milestones: [],
    },
    filter: { languages: [], keyword: '', hideBots: false },
    connectionStatus: 'disconnected',
    globeCamera: null,
    vizMode: 'beam',
    sound: { enabled: false, volume: 0.5 },
    playbackState: 'live',
    autoRotate: true,
    showTutorial: false,
    isFullscreen: false,
    dayNightEnabled: false,
    trendArticles: [],
    editBattles: [],
    newArticles: [],
    sessionStats: {
      startTime: Date.now(),
      totalEdits: 0,
      totalNewArticles: 0,
      mostActiveLanguage: '',
      mostEditedArticle: '',
      humanEdits: 0,
      botEdits: 0,
      editTimeSeries: [],
    },
    recentEditsForStats: [],
    editHistoryBuckets: [],
    totalEditsEver: 0,
    articleEditHistory: {},
    heatmapData: [],
    timelineHistory: [],
    previewArticle: null,

    botEnabled: true,
    setPreviewArticle: (article) => set((d) => { d.previewArticle = article; }),
    setBotEnabled: (value) => set((d) => { d.botEnabled = value; }),
    setGlobeCamera: (camera) => set((d) => { d.globeCamera = camera; }),
    setSelectedEvent: (event) => set((d) => { d.selectedEvent = event; }),
    setArticlePreview: (preview) => set((d) => { d.articlePreview = preview; }),
    setConnectionStatus: (status) => set((d) => { d.connectionStatus = status; }),
    setVizMode: (mode) => set((d) => { d.vizMode = mode; }),
    setSound: (settings) => set((d) => { Object.assign(d.sound, settings); }),
    setPlaybackState: (state) => set((d) => { d.playbackState = state; }),
    setAutoRotate: (value) => set((d) => { d.autoRotate = value; }),
    setShowTutorial: (value) => set((d) => { d.showTutorial = value; }),
    setIsFullscreen: (value) => set((d) => { d.isFullscreen = value; }),
    setDayNightEnabled: (value) => set((d) => { d.dayNightEnabled = value; }),

    setFilter: (filter) => set((d) => { Object.assign(d.filter, filter); }),

    addEditEvent: (event: WikipediaEditEvent) => {
      get().addEditEventsBatch([event]);
    },

    addEditEventsBatch: (events: WikipediaEditEvent[]) => {
      if (events.length === 0) return;
      const now = Date.now();
      const state = get();

      // Pre-compute event metadata OUTSIDE Immer
      const processedEvents = events.map((event) => {
        const lang = extractLanguage(event.wiki);
        const byteDiff = event.lengthNew - event.lengthOld;
        const position = getPositionForLanguage(event.wiki);

        let shouldDisplay = true;
        if (state.filter.languages.length > 0 && !state.filter.languages.includes(lang)) {
          shouldDisplay = false;
        }
        if (state.filter.hideBots && event.bot) {
          shouldDisplay = false;
        }

        const eventWithMeta: EditEventWithMeta | null = shouldDisplay ? {
          ...event,
          position,
          color: getColorForLanguage(event.wiki, event.bot),
          size: getSizeForEdit(event),
          createdAt: now,
        } : null;

        return { event, lang, byteDiff, position, eventWithMeta };
      });

      // Pre-compute stats OUTSIDE Immer
      const oneMinuteAgo = now - 60000;
      const allNewEdits = events.map((e) => ({
        timestamp: now, wiki: e.wiki, title: e.title,
        bot: e.bot, type: e.type, byteDiff: e.lengthNew - e.lengthOld,
      }));
      const newRecentEditsForStats = [
        ...state.recentEditsForStats.filter((e) => e.timestamp > oneMinuteAgo),
        ...allNewEdits,
      ];

      const editsByLanguage: Record<string, number> = {};
      let botEditsCount = 0;
      let humanEditsCount = 0;
      for (const edit of newRecentEditsForStats) {
        const l = extractLanguage(edit.wiki);
        editsByLanguage[l] = (editsByLanguage[l] || 0) + 1;
        if (edit.bot) botEditsCount++;
        else humanEditsCount++;
      }
      let mostActiveLanguage = '';
      let maxLangCount = 0;
      for (const [l, c] of Object.entries(editsByLanguage)) {
        if (c > maxLangCount) { maxLangCount = c; mostActiveLanguage = l; }
      }
      const recentTitles = newRecentEditsForStats
        .filter((e) => !e.bot).slice(-10).reverse().map((e) => e.title);

      // Pre-compute most edited article from plain state + batch
      const articleCounts = new Map<string, number>();
      for (const key in state.articleEditHistory) {
        articleCounts.set(key, state.articleEditHistory[key].count);
      }
      for (const event of events) {
        const key = `${event.wiki}:${event.title}`;
        articleCounts.set(key, (articleCounts.get(key) || 0) + 1);
      }
      let mostEditedArticle = '';
      let maxArticleEdits = 0;
      for (const [key, count] of articleCounts) {
        if (count > maxArticleEdits) {
          maxArticleEdits = count;
          mostEditedArticle = key.split(':').slice(1).join(':');
        }
      }

      // Pre-compute new edit events (newest first)
      const newEditEvents = processedEvents
        .filter((pe) => pe.eventWithMeta !== null)
        .map((pe) => pe.eventWithMeta!)
        .reverse();

      // Pre-compute new timeline entries (newest first)
      const newTimelineEntries = events.map((event) => ({
        id: event.id || `${now}-${Math.random()}`,
        title: event.title,
        wiki: event.wiki,
        user: event.user,
        bot: event.bot,
        type: (event.type === 'new' ? 'new' : 'edit') as 'new' | 'edit',
        byteDiff: event.lengthNew - event.lengthOld,
        timestamp: now,
      })).reverse();

      // Pre-compute new heatmap points
      const newHeatmapPoints = processedEvents.map((pe) => ({
        lat: pe.position.lat, lng: pe.position.lng,
        weight: Math.abs(pe.byteDiff) || 1,
      }));

      // Aggregate counts
      let batchBots = 0, batchHumans = 0, batchNew = 0;
      for (const event of events) {
        if (event.bot) batchBots++;
        else batchHumans++;
        if (event.type === 'new') batchNew++;
      }

      const newNewArticles = events
        .filter((e) => e.type === 'new')
        .map((e) => ({ title: e.title, wiki: e.wiki, time: now }))
        .reverse();

      // SINGLE Immer set() for entire batch — minimal proxy reads
      set((d) => {
        d.recentEditsForStats = newRecentEditsForStats;

        // Edit history buckets
        const bucketTime = Math.floor(now / 10000) * 10000;
        const lastBucket = d.editHistoryBuckets[d.editHistoryBuckets.length - 1];
        if (lastBucket && lastBucket.timestamp === bucketTime) {
          lastBucket.count += events.length;
        } else {
          d.editHistoryBuckets.push({ timestamp: bucketTime, count: events.length });
        }
        if (d.editHistoryBuckets.length > 30) {
          d.editHistoryBuckets = d.editHistoryBuckets.slice(-30);
        }

        d.totalEditsEver += events.length;

        // Session stats (aggregated)
        d.sessionStats.totalEdits += events.length;
        d.sessionStats.botEdits += batchBots;
        d.sessionStats.humanEdits += batchHumans;
        d.sessionStats.totalNewArticles += batchNew;

        const minuteBucket = Math.floor(now / 60000) * 60000;
        const lastTs = d.sessionStats.editTimeSeries[d.sessionStats.editTimeSeries.length - 1];
        if (lastTs && lastTs.time === minuteBucket) {
          lastTs.count += events.length;
        } else {
          d.sessionStats.editTimeSeries.push({ time: minuteBucket, count: events.length });
        }
        if (d.sessionStats.editTimeSeries.length > 60) {
          d.sessionStats.editTimeSeries = d.sessionStats.editTimeSeries.slice(-60);
        }

        // Article edit history (per-event mutations)
        for (const { event, byteDiff, position } of processedEvents) {
          const key = `${event.wiki}:${event.title}`;
          if (!d.articleEditHistory[key]) {
            d.articleEditHistory[key] = {
              count: 0, lastEdit: 0, wiki: event.wiki,
              editors: new Set(), byteChanges: [],
              lat: position.lat, lng: position.lng,
            };
          }
          const entry = d.articleEditHistory[key];
          entry.count++;
          entry.lastEdit = now;
          entry.editors.add(event.user);
          entry.byteChanges.push(byteDiff);
        }

        // Bulk array updates (pre-computed, just assign)
        if (newNewArticles.length > 0) {
          d.newArticles = [...newNewArticles, ...d.newArticles].slice(0, 50);
        }
        d.timelineHistory = [...newTimelineEntries, ...d.timelineHistory].slice(0, 200);
        d.heatmapData = [...d.heatmapData, ...newHeatmapPoints].slice(-500);

        if (newEditEvents.length > 0) {
          d.editEvents = [...newEditEvents, ...d.editEvents].slice(0, MAX_EVENTS);
        }

        // Stats (computed once for batch)
        const editHistory = d.editHistoryBuckets.map((b) => b.count);
        d.stats.totalEditsLastMinute = newRecentEditsForStats.length;
        d.stats.editsByLanguage = editsByLanguage;
        d.stats.recentTitles = recentTitles;
        d.stats.botEdits = botEditsCount;
        d.stats.humanEdits = humanEditsCount;
        d.stats.mostActiveLanguage = mostActiveLanguage;
        d.stats.editHistory = editHistory;
        d.sessionStats.mostActiveLanguage = mostActiveLanguage;
        d.sessionStats.mostEditedArticle = mostEditedArticle;
      });
    },

    removeExpiredEvents: () => {
      const now = Date.now();
      const state = get();

      // Compute trends/battles OUTSIDE Immer (read from plain state, no proxy overhead)
      const oneHourAgo = now - 3600000;
      const tenMinAgo = now - 600000;
      const thirtyMinAgo = now - 1800000;

      const keysToDelete: string[] = [];
      const trendCandidates: [string, typeof state.articleEditHistory[string]][] = [];
      const battleCandidates: [string, typeof state.articleEditHistory[string]][] = [];

      for (const key in state.articleEditHistory) {
        const entry = state.articleEditHistory[key];
        if (entry.lastEdit < oneHourAgo) {
          keysToDelete.push(key);
        } else {
          trendCandidates.push([key, entry]);
          if (entry.count >= 3 && entry.lastEdit > tenMinAgo && entry.editors.size >= 2) {
            battleCandidates.push([key, entry]);
          }
        }
      }

      const sortedTrends = trendCandidates
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10);

      const oldRanks = new Map(state.trendArticles.map((t, i) => [t.title, i]));
      const newTrends = sortedTrends.map(([key, data]) => {
        const title = key.split(':').slice(1).join(':');
        return {
          title,
          wiki: data.wiki,
          editCount: data.count,
          lastEditTime: data.lastEdit,
          previousRank: oldRanks.has(title) ? oldRanks.get(title)! : null,
        };
      });

      const newBattles = battleCandidates
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([key, data]) => ({
          id: key,
          title: key.split(':').slice(1).join(':'),
          wiki: data.wiki,
          editorCount: data.editors.size,
          editCount: data.count,
          byteFluctuation: data.byteChanges.reduce((sum, v) => sum + Math.abs(v), 0),
          startTime: now - 600000,
          lastEditTime: data.lastEdit,
          lat: data.lat,
          lng: data.lng,
        }));

      const newNewArticles = state.newArticles.filter((a) => a.time > thirtyMinAgo);

      // Pre-compute filtered arrays OUTSIDE Immer (no proxy overhead)
      const filteredEditEvents = state.editEvents.filter((e) => now - e.createdAt < EVENT_TTL_MS);
      const filteredMilestones = state.stats.milestones.filter((m) => now - m.timestamp < 5000);

      // Single Immer pass — only assignments, no reads through proxy
      set((d) => {
        d.editEvents = filteredEditEvents;
        d.stats.milestones = filteredMilestones;
        for (const key of keysToDelete) {
          delete d.articleEditHistory[key];
        }
        d.newArticles = newNewArticles;
        d.trendArticles = newTrends;
        d.editBattles = newBattles;
      });
    },

  }))
);

export { extractLanguage, getColorForLanguage, getEditSizeCategory };
