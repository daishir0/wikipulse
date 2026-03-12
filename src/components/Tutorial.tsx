'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Step {
  title: string;
  content: React.ReactNode;
}

const TUTORIAL_KEY = 'wikipulse-tutorial-seen-v2';

function StepVision() {
  return (
    <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
      <p className="text-base text-white font-medium">
        WikiPulseは、世界中のWikipediaの編集をリアルタイムで3D地球儀上に可視化するアプリです。
      </p>
      <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg p-3">
        <p className="text-blue-200 text-xs leading-relaxed">
          私たちはふだん、自分の言語圏・関心圏の情報しか目にしません。SNSのアルゴリズムは「見たいもの」だけを見せ、世界は見えない壁 —— フィルターバブル —— で仕切られています。
        </p>
        <p className="text-blue-200 text-xs leading-relaxed mt-2">
          WikiPulseは、この壁を透明にしたいという思いから生まれました。
        </p>
      </div>
      <p>
        Wikipediaは世界中の人々が自発的に知識を書き、直し、積み上げている場所です。いまこの瞬間にも、東京で歴史の記事が加筆され、サンパウロで音楽家の項目が作られ、ベルリンで科学の記述が修正されています。
      </p>
      <p className="text-white">
        地球のどこを見ても、知を紡いでいる人がいる。その実感が、フィルターバブルを溶かす最初の一歩です。
      </p>
    </div>
  );
}

function StepGlobe() {
  return (
    <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
      <p className="text-base text-white font-medium">
        見る — 地球儀とリアルタイム可視化
      </p>
      <ul className="space-y-2">
        <li className="flex gap-2">
          <span className="text-blue-400 flex-shrink-0">●</span>
          <span>編集が発生すると、その場所に<span className="text-cyan-300">波紋</span>が広がります</span>
        </li>
        <li className="flex gap-2">
          <span className="text-yellow-400 flex-shrink-0">●</span>
          <span>記事タイトルが宙に浮かびます。色は編集の規模を表します：
            <span className="text-yellow-400"> ゴールド</span>=新規記事、
            <span className="text-red-400"> 赤</span>=大規模編集、
            <span className="text-blue-400"> 青</span>=加筆、
            <span className="text-purple-400"> 紫</span>=削除
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-green-400 flex-shrink-0">●</span>
          <span>タイトルをクリックすると<span className="text-cyan-300">記事プレビュー</span>が開きます</span>
        </li>
        <li className="flex gap-2">
          <span className="text-orange-400 flex-shrink-0">●</span>
          <span>地球を<span className="text-cyan-300">ダブルクリック</span>すると、その地域の最近の編集が一気に表示されます</span>
        </li>
      </ul>
    </div>
  );
}

function StepSound() {
  return (
    <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
      <p className="text-base text-white font-medium">
        聴く — 編集が奏でる音楽
      </p>
      <p>
        それぞれの編集が音になります。言語ごとに異なる音階、編集の大きさで変わる音の高さ。世界中の知的活動が心地よいアンビエントミュージックとして耳に届きます。
      </p>
      <div className="bg-gray-800/60 rounded-lg p-3">
        <p className="text-xs text-gray-400 mb-2">7種類の音色プリセット</p>
        <div className="flex flex-wrap gap-1.5">
          {['Piano', 'Chord', 'Ambient', 'Minimal', 'Rain', 'Kalimba', 'Ocean'].map((name) => (
            <span key={name} className="px-2 py-0.5 bg-white/10 rounded text-xs text-white">{name}</span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          <span className="text-cyan-300">Rand</span>モードにすると15秒ごとにプリセットが自動で切り替わります
        </p>
      </div>
      <p className="text-xs text-gray-400">
        右上のスピーカーアイコンからON/OFFと音量を調整できます。
      </p>
    </div>
  );
}

function StepWikiBot() {
  return (
    <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
      <p className="text-base text-white font-medium">
        知る — ウィキまるとの対話
      </p>
      <p>
        AIマスコット<span className="text-cyan-300">「ウィキまる」</span>が、いま編集されている記事の中から話題をピックアップして解説してくれます。
      </p>
      <ul className="space-y-2">
        <li className="flex gap-2">
          <span className="text-green-400 flex-shrink-0">●</span>
          <span>2分ごとに自動でコメント（変更内容を踏まえた解説）</span>
        </li>
        <li className="flex gap-2">
          <span className="text-blue-400 flex-shrink-0">●</span>
          <span>気になる記事をクリック →「<span className="text-cyan-300">ウィキまるに送る</span>」でその記事について質問（複数連続送信OK）</span>
        </li>
        <li className="flex gap-2">
          <span className="text-purple-400 flex-shrink-0">●</span>
          <span>関連する写真付き、Wikipediaへのリンク付き</span>
        </li>
      </ul>
      <p className="text-xs text-gray-400">
        右上のロボットアイコンからON/OFFを切り替えられます。長押しで一時的に隠すこともできます（右上のボタンでも切り替え可能）。
      </p>
    </div>
  );
}

function StepPanel() {
  return (
    <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
      <p className="text-base text-white font-medium">
        探る — サイドパネル
      </p>
      <p>
        右上の<span className="text-cyan-300">メニューアイコン（≡）</span>を押すと、サイドパネルが開きます。
      </p>
      <div className="space-y-1.5">
        {[
          { label: 'Live', desc: 'すべての編集をリアルタイムで時系列表示' },
          { label: 'Trend', desc: '直近1時間で最も編集された記事ランキング' },
          { label: 'Battle', desc: '複数人が激しく編集し合う「編集バトル」の検出' },
          { label: 'New', desc: '直近30分で新しく作られた記事' },
          { label: 'Stats', desc: '総編集数、人間/Bot比率などの統計情報' },
          { label: 'Filter', desc: '言語・地域別フィルタ、Bot非表示設定' },
        ].map((item) => (
          <div key={item.label} className="flex gap-2 items-start">
            <span className="text-xs font-bold text-white bg-white/10 px-1.5 py-0.5 rounded flex-shrink-0 w-12 text-center">
              {item.label}
            </span>
            <span className="text-xs">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepControls() {
  return (
    <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
      <p className="text-base text-white font-medium">
        操作ガイド — 右上のアイコン
      </p>
      <div className="space-y-2">
        {[
          { icon: '🔊', desc: 'サウンドのON/OFF・音量・プリセット選択' },
          { icon: '🔄', desc: '地球の自動回転 ON/OFF' },
          { icon: '☀️', desc: '昼夜モード ON/OFF（太陽光の位置を反映）' },
          { icon: '🤖', desc: 'ウィキまる ON/OFF' },
          { icon: '❓', desc: 'このガイドを表示' },
          { icon: '⛶', desc: 'フルスクリーン表示' },
          { icon: '≡', desc: 'サイドパネルを開く' },
        ].map((item, i) => (
          <div key={i} className="flex gap-3 items-center">
            <span className="text-lg w-7 text-center flex-shrink-0">{item.icon}</span>
            <span className="text-xs">{item.desc}</span>
          </div>
        ))}
      </div>
      <div className="bg-gray-800/60 rounded-lg p-3 mt-2">
        <p className="text-xs text-gray-400">
          <span className="text-white font-medium">マウス操作: </span>
          ドラッグで回転 / スクロールでズーム / タイトルクリックで記事プレビュー / ダブルクリックで編集バースト
        </p>
      </div>
    </div>
  );
}

export default function Tutorial() {
  const showTutorial = useStore((s) => s.showTutorial);
  const setShowTutorial = useStore((s) => s.setShowTutorial);
  const [step, setStep] = useState(0);

  const STEPS: Step[] = [
    { title: 'WikiPulseへようこそ', content: <StepVision /> },
    { title: '見る — 地球儀', content: <StepGlobe /> },
    { title: '聴く — サウンド', content: <StepSound /> },
    { title: '知る — ウィキまる', content: <StepWikiBot /> },
    { title: '探る — サイドパネル', content: <StepPanel /> },
    { title: '操作ガイド', content: <StepControls /> },
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem(TUTORIAL_KEY);
      if (!seen) {
        setShowTutorial(true);
      }
    }
  }, [setShowTutorial]);

  const close = () => {
    setShowTutorial(false);
    setStep(0);
    localStorage.setItem(TUTORIAL_KEY, 'true');
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!showTutorial) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-600 rounded-xl max-w-md w-full mx-4 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌍</span>
            <h3 className="text-white text-lg font-bold">{STEPS[step].title}</h3>
          </div>
          <button onClick={close} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 px-4 pb-3 flex-shrink-0">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1 rounded-full transition-all ${
                i === step ? 'bg-blue-500 w-6' : i < step ? 'bg-blue-500/40 w-3' : 'bg-gray-600 w-3'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {STEPS[step].content}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 pt-3 border-t border-gray-700/50 flex-shrink-0">
          <button
            onClick={prev}
            disabled={step === 0}
            className={`flex items-center gap-1 text-sm transition-colors ${
              step === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            戻る
          </button>
          <span className="text-gray-500 text-xs">{step + 1} / {STEPS.length}</span>
          <button
            onClick={next}
            className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            {step < STEPS.length - 1 ? (
              <>次へ <ChevronRight className="w-4 h-4" /></>
            ) : (
              'はじめる'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
