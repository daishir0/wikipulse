# WikiPulse

A real-time Wikipedia edit visualization on an interactive 3D globe. Watch edits from around the world appear as colored markers, listen to piano tones for each language, and explore trends and edit battles as they happen.

> **[Japanese version below](#japanese-version)**

## Features

| Feature | Description |
|---------|-------------|
| **3D Globe** | Interactive globe powered by react-globe.gl with language-colored markers |
| **Real-time Stream** | Live Wikipedia edits via Wikimedia EventStreams SSE |
| **WikiBot** | AI mascot "WikiMaru" comments on edits using Claude CLI |
| **Sound System** | Piano tones with pentatonic scale — each language has its own pitch |
| **Trend Ranking** | Top edited articles in the last hour |
| **Edit Battles** | Detects articles with rapid edits by multiple editors |
| **Day/Night** | Real-time sun position lighting on the globe |
| **Language Filter** | Filter by language or region group |
| **Article Preview** | Click any edit to see a Wikipedia summary modal |
| **Session Stats** | Human vs Bot ratio, edits/min chart, most edited articles |

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Clone

```bash
git clone https://github.com/daishir0/wikipulse.git
cd wikipulse
```

### 2. Install

```bash
npm install
```

### 3. Configure

```bash
cp .env.sample .env.local
```

Edit `.env.local` if needed (default settings work for basic usage).

### 4. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Open http://localhost:3023 in your browser.

## Architecture

```
Wikimedia EventStreams (SSE)
        |
        v
  useWikipediaStream (hook)
        |
        v
  Zustand + Immer (store)
        |
   +---------+---------+
   |         |         |
Globe   SidePanel   WikiBot
(3D)   (timeline,   (Claude
        trends,      CLI)
        filters)
```

- **Data source**: `https://stream.wikimedia.org/v2/stream/recentchange` (public, no auth required)
- **State management**: Zustand with Immer middleware, batched event processing (300ms flush interval)
- **Globe**: react-globe.gl with Three.js for 3D rendering
- **WikiBot**: Spawns Claude CLI (`--print`) to generate comments about recent edits

## Tech Stack

| Technology | Usage |
|-----------|-------|
| Next.js 16 | App framework |
| React 19 | UI library |
| TypeScript | Type safety |
| react-globe.gl | 3D globe rendering |
| Three.js | 3D scene/lighting |
| Zustand + Immer | State management |
| Tailwind CSS | Styling |
| Web Audio API | Sound synthesis |
| Playwright | E2E testing |

## Project Structure

```
src/
+-- app/
|   +-- api/bot-comment/    # WikiBot API (Claude CLI)
|   +-- page.tsx            # Main page
|   +-- layout.tsx          # App layout
|   +-- globals.css         # Global styles
+-- components/
|   +-- Globe.tsx           # 3D globe with markers
|   +-- FloatingTitles.tsx  # Floating edit titles on globe
|   +-- WikiBot.tsx         # AI mascot chat bubble
|   +-- SidePanel.tsx       # Timeline, trends, stats, filters
|   +-- ArticlePreview.tsx  # Wikipedia article modal
|   +-- SoundControls.tsx   # Volume control
|   +-- TrendRanking.tsx    # Trending articles list
|   +-- EditBattle.tsx      # Edit battle detection
|   +-- SessionStats.tsx    # Session statistics
|   +-- Tutorial.tsx        # First-visit tutorial overlay
|   +-- HeatmapToggle.tsx   # Visualization mode switch
|   +-- TimelineSlider.tsx  # Live/replay indicator
|   +-- CameraPresets.tsx   # Globe camera positions
+-- hooks/
|   +-- useWikipediaStream.ts  # SSE connection & event processing
|   +-- useSound.ts            # Sound playback hook
|   +-- useDayNight.ts         # Sun position calculation
+-- lib/
|   +-- types.ts            # TypeScript interfaces
|   +-- constants.ts        # Colors, coordinates, sounds
|   +-- sound.ts            # Web Audio synthesis
+-- store/
|   +-- index.ts            # Zustand store
+-- utils/
    +-- geo.ts              # Geo utilities
tests/
    +-- e2e/basic.spec.ts   # Playwright tests
```

## Testing

```bash
# E2E tests
npm run test:e2e
```

## License

MIT

## Disclaimer

This project is not affiliated with Wikimedia Foundation or Anthropic.

---

---

# Japanese Version

## WikiPulse

Wikipediaのリアルタイム編集を3Dグローブ上にビジュアライズするWebアプリケーション。世界中の編集がカラフルなマーカーとして表示され、言語ごとのピアノ音を聴きながら、トレンドや編集バトルをリアルタイムで観察できます。

## 主な機能

| 機能 | 説明 |
|------|------|
| **3Dグローブ** | react-globe.glによるインタラクティブな地球儀。言語ごとに色分けされたマーカー |
| **リアルタイムストリーム** | Wikimedia EventStreams SSE経由のライブ編集データ |
| **ウィキまる** | AIマスコット「ウィキまる」がClaude CLIを使って編集にコメント |
| **サウンドシステム** | ペンタトニックスケールのピアノ音。言語ごとに異なるピッチ |
| **トレンドランキング** | 直近1時間で最も編集された記事 |
| **編集バトル** | 複数編集者による急速な編集合戦を検出 |
| **昼夜表現** | リアルタイムの太陽位置に基づくライティング |
| **言語フィルター** | 言語や地域グループでフィルタリング |
| **記事プレビュー** | 編集をクリックするとWikipedia要約をモーダル表示 |
| **セッション統計** | 人間vsBot比率、edits/minチャート、最多編集記事 |

## クイックスタート

### 前提条件

- Node.js 18以上
- npm

### 1. クローン

```bash
git clone https://github.com/daishir0/wikipulse.git
cd wikipulse
```

### 2. インストール

```bash
npm install
```

### 3. 設定

```bash
cp .env.sample .env.local
```

必要に応じて `.env.local` を編集してください（デフォルト設定で基本的に動作します）。

### 4. 起動

```bash
# 開発モード
npm run dev

# 本番モード
npm run build
npm start
```

ブラウザで http://localhost:3023 を開いてください。

## アーキテクチャ

```
Wikimedia EventStreams (SSE)
        |
        v
  useWikipediaStream (hook)
        |
        v
  Zustand + Immer (store)
        |
   +---------+---------+
   |         |         |
Globe   SidePanel   WikiBot
(3D)   (タイム     (Claude
        ライン,     CLI)
        トレンド,
        フィルタ)
```

- **データソース**: `https://stream.wikimedia.org/v2/stream/recentchange`（公開API、認証不要）
- **状態管理**: Zustand + Immerミドルウェア、バッチイベント処理（300msフラッシュ間隔）
- **グローブ**: react-globe.gl + Three.jsによる3Dレンダリング
- **ウィキまる**: Claude CLI（`--print`）を呼び出して直近の編集についてコメントを生成

## 技術スタック

| 技術 | 用途 |
|------|------|
| Next.js 16 | アプリフレームワーク |
| React 19 | UIライブラリ |
| TypeScript | 型安全性 |
| react-globe.gl | 3Dグローブレンダリング |
| Three.js | 3Dシーン・ライティング |
| Zustand + Immer | 状態管理 |
| Tailwind CSS | スタイリング |
| Web Audio API | サウンド合成 |
| Playwright | E2Eテスト |

## プロジェクト構成

```
src/
+-- app/
|   +-- api/bot-comment/    # ウィキまるAPI（Claude CLI）
|   +-- page.tsx            # メインページ
|   +-- layout.tsx          # アプリレイアウト
|   +-- globals.css         # グローバルスタイル
+-- components/
|   +-- Globe.tsx           # 3Dグローブとマーカー
|   +-- FloatingTitles.tsx  # グローブ上のフローティングタイトル
|   +-- WikiBot.tsx         # AIマスコットチャットバブル
|   +-- SidePanel.tsx       # タイムライン、トレンド、統計、フィルタ
|   +-- ArticlePreview.tsx  # Wikipedia記事プレビューモーダル
|   +-- SoundControls.tsx   # 音量コントロール
|   +-- TrendRanking.tsx    # トレンド記事リスト
|   +-- EditBattle.tsx      # 編集バトル検出
|   +-- SessionStats.tsx    # セッション統計
|   +-- Tutorial.tsx        # 初回訪問チュートリアル
|   +-- HeatmapToggle.tsx   # 可視化モード切替
|   +-- TimelineSlider.tsx  # ライブ/リプレイ表示
|   +-- CameraPresets.tsx   # グローブカメラプリセット
+-- hooks/
|   +-- useWikipediaStream.ts  # SSE接続・イベント処理
|   +-- useSound.ts            # サウンド再生フック
|   +-- useDayNight.ts         # 太陽位置計算
+-- lib/
|   +-- types.ts            # TypeScriptインターフェース
|   +-- constants.ts        # 色、座標、サウンド定数
|   +-- sound.ts            # Web Audioサウンド合成
+-- store/
|   +-- index.ts            # Zustandストア
+-- utils/
    +-- geo.ts              # 地理ユーティリティ
tests/
    +-- e2e/basic.spec.ts   # Playwrightテスト
```

## テスト

```bash
# E2Eテスト
npm run test:e2e
```

## ライセンス

MIT

## 免責事項

本プロジェクトはWikimedia FoundationおよびAnthropicとは無関係です。