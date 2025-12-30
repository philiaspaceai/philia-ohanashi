
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Preset, LogEntry } from '../types.ts';
import { useOhanashi } from '../hooks/useOhanashi.ts';
import { AudioVisualizer } from '../components/AudioVisualizer.tsx';
import { APP_TITLE } from '../constants.ts';
import { Button } from '../components/Button.tsx';

interface TalkPageProps {
  preset: Preset;
  onEndConversation: () => void;
}

export const TalkPage: React.FC<TalkPageProps> = ({ preset, onEndConversation }) => {
  const { status, audioActive, startSession, stopSession, getLogs } = useOhanashi();
  const [sessionLogs, setSessionLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    startSession(preset);
    // Safety net cleanup
    return () => {
      stopSession();
    };
  }, [preset, startSession, stopSession]);

  const handleExit = () => {
    setSessionLogs(getLogs()); // Capture logs before stopping
    stopSession();
    onEndConversation();
  };

  const handleDownloadLog = () => {
    const logs = getLogs();
    if (!logs || logs.length === 0) return;
    const logData = logs.map(log => `[${log.timestamp}] ${log.event}: ${JSON.stringify(log.details)}`).join('\n');
    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ohanashi_log_${preset.aiNickname}_${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-screen flex flex-col">
      <nav className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-10 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif-jp tracking-[0.2em]">{APP_TITLE}</h1>
        <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={handleDownloadLog} className="rounded-full px-8">
                Download Log
            </Button>
            <Button variant="danger" size="sm" onClick={handleExit} className="rounded-full px-8">
                End Session
            </Button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center pt-20 pb-10 px-10">
        <div className="flex flex-col items-center justify-center space-y-12 text-center">
            <motion.div 
                layoutId={`preset-card-${preset.id}`}
                className="w-48 h-48 rounded-full border-2 flex items-center justify-center bg-white shadow-xl"
            >
                <span className="text-7xl font-serif-jp">{preset.aiNickname.charAt(0)}</span>
            </motion.div>
            
            <div>
                <h2 className="text-4xl font-bold font-serif-jp tracking-tight">{preset.aiNickname}</h2>
                <p className="text-gray-400 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">{status}</p>
            </div>

            <div className="w-full max-w-sm">
                <AudioVisualizer active={audioActive || status === 'Connected'} />
            </div>
        </div>
      </main>
    </motion.div>
  );
};
