// Wikipedia Edit Event Types
export type EditType = 'new' | 'edit';
export type EditSizeCategory = 'new' | 'major' | 'minor';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type VisualizationMode = 'beam' | 'heatmap';
export type PlaybackState = 'live' | 'replay';

export interface WikipediaEditEvent {
  id: string;
  wiki: string;
  title: string;
  type: EditType;
  user: string;
  timestamp: number;
  lengthOld: number;
  lengthNew: number;
  minor: boolean;
  bot: boolean;
  comment: string;
  serverUrl: string;
}

export interface GeoPosition {
  lat: number;
  lng: number;
}

export interface EditEventWithMeta extends WikipediaEditEvent {
  position: GeoPosition;
  color: string;
  size: number;
  createdAt: number;
}

export interface PointData {
  id: string;
  lat: number;
  lng: number;
  altitude: number;
  color: string;
  radius: number;
}

export interface LabelData {
  id: string;
  lat: number;
  lng: number;
  text: string;
  color: string;
  size: number;
}

export interface GlobeCamera {
  getScreenPosition: (lat: number, lng: number, altitude: number) => { x: number; y: number; visible: boolean } | null;
}

export interface StatsData {
  totalEditsLastMinute: number;
  editsByLanguage: Record<string, number>;
  recentTitles: string[];
  botEdits: number;
  humanEdits: number;
  mostActiveLanguage: string;
  editHistory: number[];
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  type: 'count' | 'newArticle' | 'majorEdit';
  message: string;
  timestamp: number;
}

export interface FilterState {
  languages: string[];
  keyword: string;
  hideBots: boolean;
}

// Trend Ranking
export interface TrendArticle {
  title: string;
  wiki: string;
  editCount: number;
  lastEditTime: number;
  previousRank: number | null;
}

// Edit Battle
export interface EditBattle {
  id: string;
  title: string;
  wiki: string;
  editorCount: number;
  editCount: number;
  byteFluctuation: number;
  startTime: number;
  lastEditTime: number;
  lat: number;
  lng: number;
}

// Session Stats
export interface SessionStatsData {
  startTime: number;
  totalEdits: number;
  totalNewArticles: number;
  mostActiveLanguage: string;
  mostEditedArticle: string;
  humanEdits: number;
  botEdits: number;
  editTimeSeries: { time: number; count: number }[];
}

// Sound Settings
export interface SoundSettings {
  enabled: boolean;
  volume: number;
}

// Camera Preset
export interface CameraPreset {
  name: string;
  label: string;
  lat: number;
  lng: number;
  altitude: number;
}

// Article Preview
export interface ArticlePreview {
  title: string;
  extract: string;
  thumbnail?: string;
  url: string;
  lang: string;
}

// Timeline Entry (for sidebar history)
export interface TimelineEntry {
  id: string;
  title: string;
  wiki: string;
  user: string;
  bot: boolean;
  type: EditType;
  byteDiff: number;
  timestamp: number;
}

// Raw Event Stream Data from Wikipedia
export interface RawEventStreamData {
  $schema: string;
  meta: {
    uri: string;
    request_id: string;
    id: string;
    dt: string;
    domain: string;
    stream: string;
  };
  id: number;
  type: 'edit' | 'new' | 'log' | 'categorize';
  namespace: number;
  title: string;
  comment: string;
  timestamp: number;
  user: string;
  bot: boolean;
  minor: boolean;
  length?: { old: number; new: number };
  revision?: { old: number; new: number };
  server_url: string;
  server_name: string;
  server_script_path: string;
  wiki: string;
  parsedcomment?: string;
}
