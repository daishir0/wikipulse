'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { X } from 'lucide-react';

const STEPS = [
  {
    title: 'Welcome to WikiPulse',
    description: 'This app visualizes Wikipedia edits happening around the world in real-time on a 3D globe.',
  },
  {
    title: 'Light Beams',
    description: 'Each beam of light represents an edit. Colors indicate the language of the Wikipedia being edited.',
  },
  {
    title: 'Explore & Interact',
    description: 'Click on floating titles to see article previews. Use the side panel for trends, stats, and filters.',
  },
  {
    title: 'Sound & Immersion',
    description: 'Turn on sound to hear unique tones for each edit. Different languages produce different instruments!',
  },
];

const TUTORIAL_KEY = 'wikipulse-tutorial-seen';

export default function Tutorial() {
  const showTutorial = useStore((s) => s.showTutorial);
  const setShowTutorial = useStore((s) => s.setShowTutorial);
  const [step, setStep] = useState(0);

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
    localStorage.setItem(TUTORIAL_KEY, 'true');
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  if (!showTutorial) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-600 rounded-xl max-w-sm w-full mx-4 p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-blue-500' : 'bg-gray-600'}`} />
            ))}
          </div>
          <button onClick={close} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <h3 className="text-white text-lg font-bold mb-2">{STEPS[step].title}</h3>
        <p className="text-gray-300 text-sm mb-6">{STEPS[step].description}</p>

        <div className="flex justify-between">
          <button onClick={close} className="text-gray-400 text-sm hover:text-white">Skip</button>
          <button onClick={next}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
            {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
