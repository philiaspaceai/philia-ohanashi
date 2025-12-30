
import React, { useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { Preset } from './types.ts';
import { MainPage } from './pages/MainPage.tsx';
import { TalkPage } from './pages/TalkPage.tsx';

export default function App() {
  const [view, setView] = useState<'main' | 'talk'>('main');
  const [activePreset, setActivePreset] = useState<Preset | null>(null);

  const handleStartConversation = (preset: Preset) => {
    setActivePreset(preset);
    setView('talk');
  };

  const handleEndConversation = () => {
    setView('main');
  };

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white font-sans antialiased">
      <LayoutGroup>
        <AnimatePresence mode="wait" onExitComplete={() => { if(view === 'main') setActivePreset(null) }}>
          {view === 'main' ? (
            <MainPage 
              key="main"
              onStartConversation={handleStartConversation} 
            />
          ) : activePreset ? (
            <TalkPage 
              key="talk"
              preset={activePreset} 
              onEndConversation={handleEndConversation} 
            />
          ) : null}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
