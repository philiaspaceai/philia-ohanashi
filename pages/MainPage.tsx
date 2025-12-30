
import React, { useState, useEffect } from 'react';
// FIX: Import AnimatePresence from framer-motion to resolve 'Cannot find name' error.
import { motion, AnimatePresence } from 'framer-motion';
import { Preset, Language, VoiceModel, PitchMode, AdvancedVocalSettings } from '../types.ts';
import { APP_TITLE, DEFAULT_PRESETS } from '../constants.ts';
import { Button } from '../components/Button.tsx';
import { Modal } from '../components/Modal.tsx';
import { getAllPresets, savePresetDB, deletePresetDB } from '../db.tsx';

interface MainPageProps {
  onStartConversation: (preset: Preset) => void;
}

const ADVANCED_VOCAL_OPTIONS: { title: string; key: keyof AdvancedVocalSettings; options: { id: string; label: string }[] }[] = [
    {
        title: 'Vocal Texture',
        key: 'texture',
        options: [
            { id: 'husky', label: 'Husky' },
            { id: 'hoarse', label: 'Hoarse / Serak' },
            { id: 'deep', label: 'Deep / Berat' },
            { id: 'airy', label: 'Airy / Berbisik' },
            { id: 'sharp', label: 'Sharp / Tajam' }
        ]
    },
    {
        title: 'Breathing & Pauses',
        key: 'breathing',
        options: [
            { id: 'heavy_breath', label: 'Napas Berat' },
            { id: 'subtle_breath', label: 'Napas Halus' },
            { id: 'frequent_pauses', label: 'Sering Jeda' },
            { id: 'sighs', label: 'Terkadang Menghela Napas' }
        ]
    },
    {
        title: 'Vocal Expression',
        key: 'expression',
        options: [
            { id: 'vocal_tension', label: 'Tegang / Tertekan' },
            { id: 'high_pressure', label: 'Energi Tinggi' },
            { id: 'gentle', label: 'Lembut / Tenang' },
            { id: 'monotone', label: 'Datar / Monoton' }
        ]
    }
];

export const MainPage: React.FC<MainPageProps> = ({ onStartConversation }) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Partial<Preset> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        let data = await getAllPresets();
        if (data.length === 0) {
          await Promise.all(DEFAULT_PRESETS.map(p => savePresetDB({ ...p })));
          data = await getAllPresets();
        }
        setPresets(data);
      } catch (err) {
        console.error("Failed to load presets", err);
      }
    };
    loadData();
  }, []);

  const handleCreatePreset = () => {
    setEditingPreset({
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <nav className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-10 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif-jp tracking-[0.2em]">{APP_TITLE}</h1>
        <Button variant="primary" size="sm" onClick={handleCreatePreset} className="rounded-full px-8">
          Create Preset
        </Button>
      </nav>

      <main className="pt-32 pb-24 px-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map(p => (
            <motion.div 
              layoutId={`preset-card-${p.id}`}
              key={p.id} 
              whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.1)" }}
              className="flex flex-col border-2 border-gray-200 p-6 bg-white transition-shadow duration-300 relative overflow-hidden group rounded-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9px] font-black tracking-[0.3em] text-gray-400 uppercase">{p.language}</span>
                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditPreset(p)} className="text-[9px] uppercase font-bold hover:text-black text-gray-400">Edit</button>
                  <button onClick={async (e) => { e.stopPropagation(); await deletePresetDB(p.id); setPresets(await getAllPresets()); }} className="text-[9px] uppercase font-bold text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>
              <h3 className="text-xl font-serif-jp font-bold mb-2">{p.name}</h3>
              <p className="text-xs text-gray-500 italic line-clamp-2 leading-relaxed mb-6 h-8">
                {p.systemInstruction || "No description provided."}
              </p>
              <Button fullWidth onClick={() => onStartConversation(p)} className="border-2 border-black/10 hover:border-black py-3 font-black tracking-widest uppercase text-[10px] mt-auto rounded-lg">
                Start Session
              </Button>
            </motion.div>
          ))}
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingPreset(null); }} title={editingPreset?.createdAt ? 'Edit Preset' : 'Create Identity'}>
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block mb-2">Preset Name</label>
                    <input 
                        className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-black transition-all shadow-sm text-sm" 
                        placeholder="e.g. Virtual Assistant"
                        value={editingPreset?.name || ''} 
                        onChange={e => setEditingPreset({...editingPreset, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block mb-2">AI Nickname</label>
                    <input 
                        className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-black transition-all shadow-sm text-sm" 
                        placeholder="e.g. Hana"
                        value={editingPreset?.aiNickname || ''} 
                        onChange={e => setEditingPreset({...editingPreset, aiNickname: e.target.value})}
                    />
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block mb-2">Voice Profile</label>
                    <select className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-2 outline-none cursor-pointer focus:border-black text-sm" value={editingPreset?.voiceModel} onChange={e => setEditingPreset({...editingPreset, voiceModel: e.target.value as VoiceModel})}>
                        {Object.values(VoiceModel).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block mb-2">Language</label>
                    <select className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-2 outline-none cursor-pointer focus:border-black text-sm" value={editingPreset?.language} onChange={e => setEditingPreset({...editingPreset, language: e.target.value as Language})}>
                        {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
            </div>
            
            <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block mb-2">System Instruction</label>
                <textarea 
                    rows={4} 
                    className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 outline-none focus:border-black transition-all resize-none text-sm leading-relaxed" 
                    placeholder="Describe their personality, background, and purpose..."
                    value={editingPreset?.systemInstruction || ''} 
                    onChange={e => setEditingPreset({...editingPreset, systemInstruction: e.target.value})}
                />
            </div>

            <div className="border-t border-gray-200 my-4"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                 <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block">Vocal Pitch</label>
                    <div className="flex bg-gray-100 rounded-full p-1 border border-gray-200 shadow-inner">
                        {Object.values(PitchMode).map(pm => (
                        <button 
                            key={pm} 
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all duration-300 ${editingPreset?.pitch === pm ? 'bg-white text-black shadow' : 'text-gray-500 hover:bg-white/50'}`}
                            onClick={() => setEditingPreset({...editingPreset, pitch: pm})}
                        >
                            {pm}
                        </button>
                        ))}
                    </div>
                 </div>
                 <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Creativity (Temp)</label>
                        <span className="text-sm font-bold font-mono">{editingPreset?.temperature?.toFixed(1)}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="1" step="0.1" 
                        className="w-full accent-black cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none" 
                        value={editingPreset?.temperature} 
                        onChange={e => setEditingPreset({...editingPreset, temperature: parseFloat(e.target.value)})} 
                    />
                 </div>
            </div>

             <div className="border-t border-gray-200 my-4"></div>

             <div>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Advanced Vocal Settings</h3>
                        <p className="text-xs text-gray-400 mt-1">Fine-tune vocal characteristics for unique personalities.</p>
                    </div>
                    <button onClick={() => setEditingPreset({ ...editingPreset, advancedMode: !editingPreset?.advancedMode })}
                        className={`w-12 h-7 rounded-full transition-colors flex items-center p-1 ${editingPreset?.advancedMode ? 'bg-black' : 'bg-gray-200'}`}>
                        <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${editingPreset?.advancedMode ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                </div>

                <AnimatePresence>
                {editingPreset?.advancedMode && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: '24px' }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                       <div className="space-y-6 p-4 border border-gray-200 rounded-lg bg-white">
                            {ADVANCED_VOCAL_OPTIONS.map(group => (
                                <div key={group.key}>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block mb-3">{group.title}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {group.options.map(opt => (
                                            <button 
                                                key={opt.id}
                                                onClick={() => toggleVocalOption(group.key, opt.id)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${editingPreset.advancedVocal?.[group.key].includes(opt.id) ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:border-black'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                       </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
            
            <div className="flex justify-end pt-4">
                <Button onClick={savePreset} className="rounded-lg px-8">Save Preset</Button>
            </div>
        </div>
      </Modal>
    </motion.div>
  );
};