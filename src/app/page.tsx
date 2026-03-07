'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useWikipediaStream } from '@/hooks/useWikipediaStream';
import { useSound } from '@/hooks/useSound';
import FloatingTitles from '@/components/FloatingTitles';

import SidePanel from '@/components/SidePanel';
import SoundControls from '@/components/SoundControls';
import TimelineSlider from '@/components/TimelineSlider';
import Tutorial from '@/components/Tutorial';
import ArticlePreview from '@/components/ArticlePreview';
import WikiBot from '@/components/WikiBot';
import { useStore } from '@/store';
import { Menu, HelpCircle, Maximize, Minimize, Sun, SunMoon, RotateCw, Database, Eye, EyeOff } from 'lucide-react';

const GlobeComponent = dynamic(() => import('@/components/Globe'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen w-screen bg-black">
      <div className="text-center">
        <div className="text-white text-2xl mb-4">Loading WikiPulse...</div>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  ),
});

function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch { return false; }
}

export default function Home() {
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const isFullscreen = useStore((s) => s.isFullscreen);
  const setIsFullscreen = useStore((s) => s.setIsFullscreen);
  const setShowTutorial = useStore((s) => s.setShowTutorial);
  const autoRotate = useStore((s) => s.autoRotate);
  const setAutoRotate = useStore((s) => s.setAutoRotate);
  const dayNightEnabled = useStore((s) => s.dayNightEnabled);
  const setDayNightEnabled = useStore((s) => s.setDayNightEnabled);
  const botCacheEnabled = useStore((s) => s.botCacheEnabled);
  const setBotCacheEnabled = useStore((s) => s.setBotCacheEnabled);
  const hideBackside = useStore((s) => s.hideBackside);
  const setHideBackside = useStore((s) => s.setHideBackside);

  useWikipediaStream();
  useSound();

  useEffect(() => {
    setMounted(true);
    setWebGLSupported(isWebGLSupported());
  }, []);

  // Fullscreen API
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [setIsFullscreen]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!webGLSupported) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-6">🌍</div>
          <h1 className="text-white text-2xl font-bold mb-4">WebGL Not Supported</h1>
          <p className="text-gray-400">Please use a modern browser with WebGL support.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <GlobeComponent />
      <FloatingTitles />

      {/* Top-left: Timeline */}
      <div className="fixed top-4 left-4 z-20">
        <TimelineSlider />
      </div>

      {/* Top-right: Controls */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
        <SoundControls />
        <button onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-lg transition-colors ${
            autoRotate ? 'bg-blue-600/50 hover:bg-blue-600/70' : 'bg-white/10 hover:bg-white/20'
          }`}
          title={autoRotate ? '自動回転: ON' : '自動回転: OFF'}>
          <RotateCw className={`w-5 h-5 ${autoRotate ? 'text-blue-300' : 'text-gray-400'}`} />
        </button>
        <button onClick={() => setDayNightEnabled(!dayNightEnabled)}
          className={`p-2 rounded-lg transition-colors ${
            dayNightEnabled ? 'bg-yellow-600/50 hover:bg-yellow-600/70' : 'bg-white/10 hover:bg-white/20'
          }`}
          title={dayNightEnabled ? '昼夜モード: ON' : '昼夜モード: OFF'}>
          {dayNightEnabled ? <Sun className="w-5 h-5 text-yellow-300" /> : <SunMoon className="w-5 h-5 text-gray-400" />}
        </button>
        <button onClick={() => setBotCacheEnabled(!botCacheEnabled)}
          className={`p-2 rounded-lg transition-colors ${
            botCacheEnabled ? 'bg-purple-600/50 hover:bg-purple-600/70' : 'bg-white/10 hover:bg-white/20'
          }`}
          title={botCacheEnabled ? 'コメントキャッシュ: ON' : 'コメントキャッシュ: OFF'}>
          <Database className={`w-5 h-5 ${botCacheEnabled ? 'text-purple-300' : 'text-gray-400'}`} />
        </button>
        <button onClick={() => setHideBackside(!hideBackside)}
          className={`p-2 rounded-lg transition-colors ${
            hideBackside ? 'bg-cyan-600/50 hover:bg-cyan-600/70' : 'bg-white/10 hover:bg-white/20'
          }`}
          title={hideBackside ? '裏側非表示: ON' : '裏側非表示: OFF'}>
          {hideBackside ? <EyeOff className="w-5 h-5 text-cyan-300" /> : <Eye className="w-5 h-5 text-gray-400" />}
        </button>
        <button onClick={() => setShowTutorial(true)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          title="使い方">
          <HelpCircle className="w-5 h-5 text-gray-300" />
        </button>
        <button onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          title="全画面">
          {isFullscreen ? <Minimize className="w-5 h-5 text-gray-300" /> : <Maximize className="w-5 h-5 text-gray-300" />}
        </button>
        <button onClick={() => setIsPanelOpen(true)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          title="メニュー">
          <Menu className="w-5 h-5 text-white" />
        </button>
      </div>


      <WikiBot />
      <SidePanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
      <ArticlePreview />
      <Tutorial />
    </main>
  );
}
