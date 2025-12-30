
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Preset, AppState, Language, VoiceModel, PitchMode, AdvancedVocalSettings, LogEntry } from './types.ts';
import { APP_TITLE, DEFAULT_PRESETS } from './constants.ts';
import { Button } from './components/Button.tsx';
import { Modal } from './components/Modal.tsx';
import { AudioVisualizer } from './components/AudioVisualizer.tsx';
import { getAllPresets, savePresetDB, deletePresetDB } from './db.tsx';
import { useOhanashi } from './hooks/useOhanashi.ts';

const ADVANCED_OPTIONS = {
  texture: [
    { id: 'husky', label: 'Husky' },
    { id: 'hoarse', label: 'Serak / Hoarse' },
    { id: 'deep', label: 'Deep / Berat' },
    { id: 'airy', label: 'Airy / Breathy' },
    { id: 'sharp', label: 'Sharp / Tajam' }
  ],
  breathing: [
    { id: 'heavy', label: 'Heavy Breathing' },
    { id: 'subtle', label: 'Subtle Breath' },
    { id: 'pauses', label: 'Frequent Pauses' },
    { id: 'sighs', label: 'Occasional Sighs' }
  ],
  expression: [
    { id: 'tension', label: 'Vocal Tension' },
    { id: 'dynamic', label: 'High Pressure' },
    { id: 'soft', label: 'Gentle / Lembut' },
    { id: 'monotone', label: 'Calm / Flat' }
  ]
};

export default function App() {
  const [appState, setAppState] = useState<AppState>('home');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [currentPreset, setCurrentPreset] = useState<Preset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Partial<Preset> | null>(null);
  const [sessionLogs, setSessionLogs] = useState<LogEntry[] | null>(null);

  const { status, audioActive, startSession, stopSession, getLogs } = useOhanashi();

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllPresets();
        if (data.length === 0) {
          for (const p of DEFAULT_PRESETS) {
            await savePresetDB({ ...p });
          }
          setPresets(DEFAULT_PRESETS);
        } else {
          setPresets(data);
        }
      } catch (err) {
        console.error("Failed to load presets", err);
      }
    };
    loadData();
  }, []);

  const handleCreatePreset = () => {
    setEditingPreset({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      aiNickname: '',
      voiceModel: VoiceModel.KORE,
      language: Language.INDONESIA,
      systemInstruction: '',
      pitch: PitchMode.NORMAL,
      temperature: 0.7,
      advancedMode: false,
      advancedVocal: { texture: [], breathing: [], expression: [] },
      createdAt: Date.now(),
    });
    setIsModalOpen(true);
  };

  const handleEditPreset = (preset: Preset) => {
    setEditingPreset({ ...preset });
    setIsModalOpen(true);
  };

  const savePreset = async () => {
    if (!editingPreset?.name || !editingPreset?.aiNickname) return;
    const newPreset = editingPreset as Preset;
    await savePresetDB(newPreset);
    setPresets(await getAllPresets());
    setIsModalOpen(false);
    setEditingPreset(null);
  };

  const toggleVocalOption = (category: keyof AdvancedVocalSettings, id: string) => {
    if (!editingPreset?.advancedVocal) return;
    const currentList = editingPreset.advancedVocal[category];
    const newList = currentList.includes(id) 
      ? currentList.filter(item => item !== id)
      : [...currentList, id];
    
    setEditingPreset({
      ...editingPreset,
      advancedVocal: { ...editingPreset.advancedVocal, [category]: newList }
    });
  };

  useEffect(() => {
    if (appState === 'chat' && currentPreset) {
      setSessionLogs(null); // Reset logs when starting a new session
      startSession(currentPreset);
    }
  }, [appState, currentPreset, startSession]);

  const handleStopChat = useCallback(() => {
    stopSession();
    setSessionLogs(getLogs());
    setAppState('home');
    // We keep currentPreset for the exit animation, it will be cleared after
  }, [stopSession, getLogs]);

  const handleDownloadLog = () => {
    if (!sessionLogs || sessionLogs.length === 0) return;

    const logHeader = `Ohanashi Session Log\nTimestamp: ${new Date().toLocaleString()}\nUser Agent: ${navigator.userAgent}\n\n========================================\n\n`;
    
    const formattedLogs = sessionLogs.map(log => 
      `[${log.timestamp}] - ${log.event}\n${JSON.stringify(log.details, null, 2)}`
    ).join('\n\n----------------------------------------\n\n');

    const fullLog = logHeader + formattedLogs;
    const blob = new Blob([fullLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ohanashi_log_${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white font-sans antialiased">
      <nav className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-10 py-6 flex items-center justify-between">
        <motion.h1 
          whileHover={{ scale: 1.02 }}
          className="text-2xl font-bold font-serif-jp tracking-[0.2em] cursor-pointer" 
          onClick={() => { if (appState === 'chat') handleStopChat(); else setAppState('home'); }}
        >
          {APP_TITLE}
        </motion.h1>
        {appState === 'home' && (
          <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={handleDownloadLog} disabled={!sessionLogs || sessionLogs.length === 0} className="rounded-full px-8">
              Log
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreatePreset} className="rounded-full px-8">
              Create Preset
            </Button>
          </div>
        )}
      </nav>

      <main className="pt-32 pb-24 px-10 max-w-6xl mx-auto">
        <LayoutGroup>
          <AnimatePresence mode="wait" onExitComplete={() => setCurrentPreset(null)}>
            {appState === 'home' ? (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {presets.map(p => (
                    <motion.div 
                      layoutId={`preset-card-${p.id}`}
                      key={p.id} 
                      whileHover={{ y: -4, shadow: "0 20px 40px -12px rgba(0,0,0,0.1)" }}
                      className="flex flex-col border-2 border-gray-300 p-6 bg-white transition-all duration-700 relative overflow-hidden group rounded-xl"
                      style={{ borderRadius: '12px' }}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[9px] font-black tracking-[0.3em] text-gray-400 uppercase">{p.language}</span>
                        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEditPreset(p)} className="text-[9px] uppercase font-bold hover:text-black text-gray-400">Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); deletePresetDB(p.id).then(() => getAllPresets().then(setPresets)); }} className="text-[9px] uppercase font-bold text-red-400 hover:text-red-600">Delete</button>
                        </div>
                      </div>
                      <h3 className="text-xl font-serif-jp font-bold mb-2">{p.name}</h3>
                      <p className="text-xs text-gray-500 italic line-clamp-2 leading-relaxed mb-6">
                        {p.systemInstruction || "No description provided."}
                      </p>
                      <Button variant="outline" fullWidth onClick={() => { setCurrentPreset(p); setAppState('chat'); }} className="border-2 border-black/10 hover:border-black py-3 font-black tracking-widest uppercase text-[10px] mt-auto">
                        Start Session
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : currentPreset && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] space-y-16">
                <div className="relative group">
                  <motion.div 
                    layoutId={`preset-card-${currentPreset.id}`}
                    animate={{ 
                      scale: audioActive ? [1, 1.05, 1] : 1,
                      borderColor: audioActive ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.1)"
                    }} 
                    transition={{ duration: 1, repeat: audioActive ? Infinity : 0 }}
                    className="w-56 h-56 rounded-full border flex items-center justify-center bg-white shadow-2xl relative z-10"
                    style={{ borderRadius: '9999px' }}
                  >
                    <motion.span layout="position" className="text-7xl font-serif-jp">{currentPreset.aiNickname.charAt(0)}</motion.span>
                  </motion.div>
                  <AnimatePresence>
                    {audioActive && (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={{ scale: 1.2, opacity: 0.1 }} 
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="absolute inset-0 rounded-full bg-black -z-0" 
                      />
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="text-center space-y-4">
                  <h2 className="text-5xl font-bold font-serif-jp tracking-tight">{currentPreset.aiNickname}</h2>
                  <p className="text-gray-300 font-bold uppercase tracking-[0.4em] text-[10px]">{status}</p>
                </div>

                <div className="w-full max-w-md">
                  <AudioVisualizer active={audioActive || status === 'Connected'} />
                </div>

                <button 
                  onClick={handleStopChat}
                  className="w-20 h-20 rounded-full border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-500 group"
                >
                  <svg className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPreset?.name ? 'Edit Preset' : 'Create Identity'}>
        <div className="space-y-10 pb-6">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Preset Identity Name</label>
              <input 
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-5 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-lg font-medium shadow-sm" 
                placeholder="e.g. Virtual Assistant"
                value={editingPreset?.name || ''} 
                onChange={e => setEditingPreset({...editingPreset, name: e.target.value})}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">AI Calling Name</label>
              <input 
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-5 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-lg font-medium shadow-sm" 
                placeholder="e.g. Hana"
                value={editingPreset?.aiNickname || ''} 
                onChange={e => setEditingPreset({...editingPreset, aiNickname: e.target.value})}
              />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Voice Profile</label>
              <div className="relative">
                <select 
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-5 py-3 outline-none cursor-pointer appearance-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium shadow-sm" 
                  value={editingPreset?.voiceModel} 
                  onChange={e => setEditingPreset({...editingPreset, voiceModel: e.target.value as VoiceModel})}
                >
                  {Object.values(VoiceModel).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Language</label>
              <div className="relative">
                <select 
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-5 py-3 outline-none cursor-pointer appearance-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium shadow-sm" 
                  value={editingPreset?.language} 
                  onChange={e => setEditingPreset({...editingPreset, language: e.target.value as Language})}
                >
                  {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Character Soul (System Instruction)</label>
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg shadow-sm">
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest leading-relaxed flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  HANYA UNTUK IDENTITAS & KARAKTER. JANGAN MASUKKAN INSTRUKSI TEKNIS SUARA!
                </p>
              </div>
            </div>
            <textarea 
              rows={4} 
              className="w-full bg-white border-2 border-gray-300 rounded-lg p-5 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none text-sm leading-relaxed font-medium shadow-sm" 
              placeholder="Jelaskan siapa dia. Bagaimana sifatnya? Apa tujuannya? Bagaimana latar belakangnya?..."
              value={editingPreset?.systemInstruction || ''} 
              onChange={e => setEditingPreset({...editingPreset, systemInstruction: e.target.value})}
            />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
            <div className="space-y-5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Vocal Pitch</label>
              <div className="flex bg-gray-200 rounded-full p-1.5 border border-gray-300 shadow-inner">
                {Object.values(PitchMode).map(pm => (
                  <button 
                    key={pm} 
                    className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300 ${editingPreset?.pitch === pm ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-500 hover:text-black'}`}
                    onClick={() => setEditingPreset({...editingPreset, pitch: pm})}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Creativity (Temp)</label>
                <span className="text-sm font-black font-mono">{editingPreset?.temperature}</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.1" 
                className="w-full accent-black cursor-pointer h-2 bg-gray-300 rounded-lg appearance-none" 
                value={editingPreset?.temperature} 
                onChange={e => setEditingPreset({...editingPreset, temperature: parseFloat(e.target.value)})} 
              />
            </div>
          </section>

          <section className="border-t-2 border-gray-100 pt-10">
            <div className="flex items-center justify-between mb-8 p-6 bg-gray-50 rounded-xl border-2 border-gray-200 shadow-sm">
              <div>
                <h4 className="text-sm font-black tracking-widest uppercase">Advanced Vocal Engine</h4>
                <p className="text-[10px] font-medium text-gray-500 mt-1">Suntikkan tekstur vokal (Husky, Serak, Tekanan).</p>
              </div>
              <button 
                onClick={() => setEditingPreset({...editingPreset, advancedMode: !editingPreset?.advancedMode})}
                className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${editingPreset?.advancedMode ? 'bg-black' : 'bg-gray-300'}`}
              >
                <motion.div 
                  animate={{ x: editingPreset?.advancedMode ? 28 : 4 }} 
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md" 
                />
              </button>
            </div>

            <AnimatePresence>
              {editingPreset?.advancedMode && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="space-y-10 mt-6"
                >
                  <LayoutGroup>
                    {Object.entries(ADVANCED_OPTIONS).map(([cat, opts]) => (
                      <div key={cat} className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">{cat}</label>
                        <div className="flex flex-wrap gap-3">
                          {opts.map(opt => {
                            const isSelected = editingPreset.advancedVocal?.[cat as keyof AdvancedVocalSettings]?.includes(opt.id);
                            return (
                              <motion.button 
                                key={opt.id} 
                                layout
                                onClick={() => toggleVocalOption(cat as keyof AdvancedVocalSettings, opt.id)}
                                className={`px-6 py-3 text-[10px] border-2 transition-all rounded-full font-black uppercase tracking-widest shadow-sm ${isSelected ? 'bg-black text-white border-black shadow-black/20 scale-105' : 'border-gray-300 text-gray-500 bg-white hover:border-black hover:text-black'}`}
                              >
                                {opt.label}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </LayoutGroup>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <Button fullWidth size="lg" onClick={savePreset} className="py-6 rounded-xl shadow-2xl shadow-black/10 hover:translate-y-[-2px] transition-transform text-base tracking-[0.2em] font-black uppercase">
            Save Identity
          </Button>
        </div>
      </Modal>
    </div>
  );
}
