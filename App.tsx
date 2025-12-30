import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Preset, INITIAL_PRESET, VoiceModel, SupportedLanguage } from './types';
import { AdvancedEditor } from './components/AdvancedEditor';
import { createPcmBlob, decodeAudioData, buildSystemInstruction, base64ToUint8Array } from './utils/audioUtils';
import { Visualizer } from './components/Visualizer';
import { initDB, savePreset, deletePreset, getAllPresets } from './utils/db';
import { Modal } from './components/Modal';
import { SessionLogger } from './utils/logger';

// --- SVGs ---
const PlusIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>;
const ChevronLeftIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>;
const TrashIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const MicOffIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" /></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const SparklesIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
const SquareIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1" /></svg>;

type View = 'DASHBOARD' | 'EDITOR' | 'SESSION';
type SessionStatus = 'CONNECTING' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'RECONNECTING' | 'ERROR';

export default function App() {
  const [view, setView] = useState<View>('DASHBOARD');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePreset, setActivePreset] = useState<Preset>(INITIAL_PRESET);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editData, setEditData] = useState<Preset>(INITIAL_PRESET);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await initDB();
        setPresets(data);
      } catch (err) {
        console.error("DB Init failed", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refreshPresets = async () => {
    const data = await getAllPresets();
    setPresets(data);
  };

  const handleCreateNew = () => {
    setEditData({ ...INITIAL_PRESET, id: uuidv4(), createdAt: Date.now() });
    setView('EDITOR');
  };

  const handleEdit = (preset: Preset) => {
    setEditData(preset);
    setView('EDITOR');
  };

  const handleDelete = async () => {
    await deletePreset(editData.id);
    await refreshPresets();
    setIsDeleteModalOpen(false);
    setView('DASHBOARD');
  };

  const handleSave = async () => {
    await savePreset(editData);
    await refreshPresets();
    setView('DASHBOARD');
  };

  const handleStartSession = (preset: Preset) => {
    setActivePreset(preset);
    setView('SESSION');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[#fafafa] -z-10"></div>

      {view === 'DASHBOARD' && (
        <Dashboard 
          presets={presets} 
          onCreate={handleCreateNew} 
          onEdit={handleEdit} 
          onStart={handleStartSession} 
        />
      )}
      
      {view === 'EDITOR' && (
        <Editor 
          data={editData} 
          onChange={setEditData} 
          onSave={handleSave} 
          onCancel={() => setView('DASHBOARD')}
          onDelete={() => setIsDeleteModalOpen(true)}
        />
      )}

      {view === 'SESSION' && (
        <div className="fixed inset-0 z-50 animate-slide-up">
          <LiveSession 
            preset={activePreset} 
            onClose={() => setView('DASHBOARD')} 
          />
        </div>
      )}

      <Modal 
        isOpen={isDeleteModalOpen}
        title="Delete Preset"
        message={`Are you sure you want to delete "${editData.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
}

function Dashboard({ presets, onCreate, onEdit, onStart }: any) {
  return (
    <div className="h-screen flex flex-col p-6 md:p-12 animate-fade-in relative overflow-y-auto">
      <header className="mb-12 flex flex-col items-center justify-center">
         <h1 className="font-display text-5xl md:text-6xl tracking-wider text-black border-b-2 border-black pb-2 mb-3">Ohanashi</h1>
         <a 
           href="https://philiaspace.com" 
           target="_blank" 
           rel="noopener noreferrer"
           className="group flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-gray-400 hover:text-black transition-colors duration-300 font-mono"
         >
           <span>Dibuat oleh Philia Space Community</span>
         </a>
      </header>

      <div className="flex-1 w-full max-w-6xl mx-auto">
        {presets.length === 0 ? (
          <div className="text-center text-gray-400 mt-20 font-serif italic">
            No conversations yet.<br/>Create a new persona to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            {presets.map((p: Preset) => (
              <div 
                key={p.id} 
                className="group relative bg-white border border-gray-200 p-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:border-black/20 flex flex-col justify-between min-h-[220px]"
              >
                 <div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-serif text-2xl font-medium text-black group-hover:text-black">{p.name}</h3>
                        {p.advancedModeEnabled && <SparklesIcon />}
                    </div>
                    <p className="text-sm text-gray-400 font-mono mb-6 uppercase tracking-wider">{p.language} • {p.voice}</p>
                    <div className="text-xs text-gray-500 line-clamp-2 italic font-serif">
                       "{p.systemInstruction ? p.systemInstruction.slice(0, 60) + '...' : 'System default behavior.'}"
                    </div>
                 </div>

                 <div className="mt-8 flex items-center gap-3">
                    <button 
                       onClick={() => onStart(p)}
                       className="flex-1 bg-black text-white py-3 rounded-lg font-medium text-sm uppercase tracking-widest hover:bg-gray-800 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                       <span>Start Talking</span>
                    </button>
                    <button 
                       onClick={() => onEdit(p)}
                       className="p-3 text-gray-400 hover:text-black border border-transparent hover:border-gray-200 rounded-lg transition-all"
                    >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onCreate} className="fixed bottom-8 right-8 w-16 h-16 bg-black text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform z-20">
        <PlusIcon />
      </button>
    </div>
  );
}

function Editor({ data, onChange, onSave, onCancel, onDelete }: any) {
  const update = (field: keyof Preset, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white animate-slide-up shadow-2xl">
      <header className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm z-10">
        <button onClick={onCancel}><ChevronLeftIcon /></button>
        <h2 className="font-serif text-lg">Configuration</h2>
        <button onClick={onDelete} className="text-red-500 hover:text-red-600 transition-colors"><TrashIcon /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Preset Name</label>
              <input type="text" value={data.name} onChange={e => update('name', e.target.value)} className="w-full text-2xl font-serif border-b border-gray-300 focus:border-black outline-none py-2 bg-transparent" placeholder="My Assistant" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">AI Name</label>
              <input type="text" value={data.aiName} onChange={e => update('aiName', e.target.value)} className="w-full text-lg border-b border-gray-300 focus:border-black outline-none py-1 bg-transparent" placeholder="Persona Name" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Voice</label>
              <select value={data.voice} onChange={e => update('voice', e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg border-none">
                {Object.values(VoiceModel).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Language</label>
              <select value={data.language} onChange={e => update('language', e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg border-none">
                {Object.values(SupportedLanguage).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <div>
               <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 flex justify-between">
                 <span>Browser Pitch Shifter (1-10)</span>
                 <span className="font-mono">{data.browserPitch || 5}/10</span>
               </label>
               <input 
                 type="range" 
                 min="1" 
                 max="10" 
                 step="1" 
                 value={data.browserPitch || 5} 
                 onChange={e => update('browserPitch', parseInt(e.target.value))} 
                 className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black mb-1" 
               />
               <div className="flex justify-between text-[10px] text-gray-400 font-mono uppercase tracking-tighter">
                 <span>Deep</span>
                 <span>Normal</span>
                 <span>High</span>
               </div>
            </div>

            <div>
               <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">System Instruction</label>
               <textarea value={data.systemInstruction} onChange={e => update('systemInstruction', e.target.value)} className="w-full h-32 p-3 bg-gray-50 rounded-lg border-none resize-none text-sm" placeholder="Define behavior..." />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <h3 className="font-serif text-lg">Advanced Mode</h3>
              <p className="text-xs text-gray-400">Deep acoustic control</p>
            </div>
            <button onClick={() => update('advancedModeEnabled', !data.advancedModeEnabled)} className={`w-12 h-6 rounded-full relative transition-colors ${data.advancedModeEnabled ? 'bg-black' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${data.advancedModeEnabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {data.advancedModeEnabled && (
            <AdvancedEditor settings={data.advancedSettings} onChange={(s: any) => update('advancedSettings', s)} />
          )}
      </div>

      <div className="p-6 border-t border-gray-100">
        <button onClick={onSave} className="w-full py-4 bg-black text-white font-medium uppercase tracking-widest text-sm hover:bg-gray-900 transition-colors">Save Configuration</button>
      </div>
    </div>
  );
}

function LiveSession({ preset, onClose }: { preset: Preset, onClose: () => void }) {
  const [status, setStatus] = useState<SessionStatus>('CONNECTING');
  const [error, setError] = useState<string | null>(null);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);
  const [silenceDuration, setSilenceDuration] = useState<number>(0);
  
  const loggerRef = useRef<SessionLogger | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isConnectedRef = useRef(false);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeSourceCountRef = useRef(0); 
  const micMutedRef = useRef(false);
  const wakeLockRef = useRef<any>(null);
  const thinkingTimeoutRef = useRef<any>(null);
  const lastVoiceActivityRef = useRef<number>(0);

  const updateStatus = (newStatus: SessionStatus) => {
    setStatus(newStatus);
    loggerRef.current?.logStateChange(newStatus);
  };
  
  useEffect(() => {
    loggerRef.current = new SessionLogger();
    let active = true;

    const requestWakeLock = async () => {
      try { if ('wakeLock' in navigator) wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch (err) {}
    };
    requestWakeLock();

    const cleanUpResources = () => {
       isConnectedRef.current = false;
       if (wakeLockRef.current) wakeLockRef.current.release().then(() => wakeLockRef.current = null).catch(() => {});
       if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
       if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    };

    const stopAllAudio = () => {
       activeSourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
       activeSourcesRef.current.clear();
       activeSourceCountRef.current = 0;
       nextStartTimeRef.current = 0;
       micMutedRef.current = false; 
       lastVoiceActivityRef.current = Date.now();
       setSilenceDuration(0);
       if (active) updateStatus('LISTENING');
    };

    const startSession = async () => {
      if (!active) return;
      cleanUpResources();

      try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key missing.");

        const ai = new GoogleGenAI({ apiKey });
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        await Promise.all([inputCtx.resume(), outputCtx.resume()]);

        // Output Path (AI Voice)
        const outAnalyser = outputCtx.createAnalyser();
        outAnalyser.fftSize = 256;
        const outGain = outputCtx.createGain();
        outGain.gain.value = 0.8; 
        outGain.connect(outAnalyser);
        outAnalyser.connect(outputCtx.destination);
        setOutputAnalyser(outAnalyser);

        // Input Path (User Voice)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = inputCtx.createMediaStreamSource(stream);
        const inAnalyser = inputCtx.createAnalyser();
        inAnalyser.fftSize = 256;
        // CRITICAL: Connect micSource to inAnalyser DIRECTLY so visualizer sees raw mic even when we send silence to AI
        micSource.connect(inAnalyser);
        setInputAnalyser(inAnalyser);

        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
        const systemInstruction = buildSystemInstruction(preset);
        
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025', 
          callbacks: {
            onopen: () => {
              if (!active) return;
              updateStatus('LISTENING');
              isConnectedRef.current = true;
              lastVoiceActivityRef.current = Date.now();
              nextStartTimeRef.current = outputCtx.currentTime;

              scriptProcessor.onaudioprocess = (e) => {
                 if (!active || !isConnectedRef.current) return;
                 const inputData = e.inputBuffer.getChannelData(0);
                 
                 // REAL-TIME SAFETY LOGIC (Half-Duplex enforcement)
                 // If AI is speaking (activeSourceCountRef > 0) OR thinking (micMutedRef) -> SEND SILENCE
                 const isAiSpeaking = activeSourceCountRef.current > 0;
                 const isMuted = micMutedRef.current;
                 
                 const chunk = (isAiSpeaking || isMuted) 
                    ? new Float32Array(inputData.length).fill(0) 
                    : new Float32Array(inputData);
                 
                 const pcmBlob = createPcmBlob(chunk, 16000);
                 sessionPromise?.then(s => s.sendRealtimeInput({ media: pcmBlob })).catch(() => {});
              };
              micSource.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
              const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio && active) {
                if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
                try {
                  const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), outputCtx);
                  const currentTime = outputCtx.currentTime;
                  if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;
                  const source = outputCtx.createBufferSource();
                  source.buffer = audioBuffer;
                  
                  // Apply Browser-side Pitch Shift
                  // Scale 1-10: 5 is center. Mapping to cents: (val - 5) * 200
                  const pitchShiftCents = ((preset.browserPitch || 5) - 5) * 200;
                  source.detune.value = pitchShiftCents;

                  source.connect(outGain);
                  source.start(nextStartTimeRef.current);
                  activeSourcesRef.current.add(source);
                  activeSourceCountRef.current++;
                  updateStatus('SPEAKING'); 
                  nextStartTimeRef.current += audioBuffer.duration;
                  source.onended = () => {
                      activeSourcesRef.current.delete(source);
                      activeSourceCountRef.current--;
                      if (activeSourceCountRef.current === 0 && active) {
                          micMutedRef.current = false;
                          lastVoiceActivityRef.current = Date.now();
                          setSilenceDuration(0);
                          updateStatus('LISTENING');
                      }
                  };
                } catch (e) {}
              }
              if (msg.serverContent?.interrupted) stopAllAudio();
            },
            onclose: () => { isConnectedRef.current = false; if (active) setStatus('ERROR'); },
            onerror: (e) => console.error(e)
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: preset.voice } } },
            systemInstruction: systemInstruction,
            generationConfig: { temperature: preset.temperature }
          }
        });

        cleanupRef.current = () => {
           isConnectedRef.current = false;
           stream.getTracks().forEach(t => t.stop());
           if(inputCtx.state !== 'closed') inputCtx.close();
           if(outputCtx.state !== 'closed') outputCtx.close();
           sessionPromise.then(s => s.close()).catch(() => {});
        };
      } catch (e: any) {
        if (active) { updateStatus('ERROR'); setError(e.message); }
      }
    };
    startSession();
    return () => { active = false; cleanUpResources(); };
  }, [preset]);

  // VAD Effect (Now tracking even during processing to show mic activity)
  useEffect(() => {
    if (!inputAnalyser || (status !== 'LISTENING' && status !== 'PROCESSING' && status !== 'SPEAKING')) return;
    
    const vadInterval = setInterval(() => {
      const data = new Uint8Array(inputAnalyser.frequencyBinCount);
      inputAnalyser.getByteFrequencyData(data);
      let sum = 0;
      for(let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      
      if (avg > 20) {
          lastVoiceActivityRef.current = Date.now();
          setSilenceDuration(0);
      } else {
          // Silence tracking only active during LISTENING
          if (status === 'LISTENING') {
              const sil = Date.now() - lastVoiceActivityRef.current;
              setSilenceDuration(sil);
              if (sil > 8000) handleUserFinished();
          }
      }
    }, 100);
    
    return () => clearInterval(vadInterval);
  }, [inputAnalyser, status]);

  const handleUserFinished = () => {
      if (status !== 'LISTENING') return;
      micMutedRef.current = true;
      setSilenceDuration(0);
      updateStatus('PROCESSING');
      
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
      thinkingTimeoutRef.current = setTimeout(() => {
          micMutedRef.current = false;
          lastVoiceActivityRef.current = Date.now();
          if (status === 'PROCESSING') updateStatus('LISTENING');
      }, 10000); 
  };

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col items-center p-8 relative overflow-hidden font-sans">
      <header className="w-full flex justify-between items-center z-50">
         <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
         <div className="flex flex-col items-center">
            <h2 className="font-display text-2xl tracking-widest">{preset.aiName}</h2>
            <div className={`mt-1 h-1 w-1 rounded-full ${status === 'LISTENING' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : status === 'SPEAKING' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-blue-500 animate-pulse'}`}></div>
         </div>
         <span className="text-[10px] font-mono opacity-30 uppercase tracking-[0.2em]">{preset.language}</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-lg space-y-12">
         {/* VISUALIZER CONTAINER */}
         <div className="w-full h-56 relative flex flex-col items-center group">
            <Visualizer outputAnalyser={outputAnalyser} inputAnalyser={inputAnalyser} isActive={true} />
            
            {/* Reassurance text for Half-Duplex state */}
            {status === 'SPEAKING' && (
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5 backdrop-blur-md animate-fade-in">
                    <MicOffIcon />
                    <span className="text-[10px] font-mono font-bold text-white/40 tracking-widest uppercase">Mic Muted (AI Talking)</span>
                </div>
            )}

            {/* Silence Warning Overlay */}
            {status === 'LISTENING' && silenceDuration > 5000 && (
                <div className="absolute -bottom-8 text-[11px] font-mono uppercase tracking-[0.4em] text-yellow-400 animate-fade-in text-center w-full font-bold">
                    Silence... Auto-stop in {((8000 - silenceDuration) / 1000).toFixed(1)}s
                </div>
            )}
         </div>

         {/* INTERACTION AREA */}
         <div className="h-24 flex flex-col items-center justify-center w-full relative">
            {(status === 'LISTENING' || status === 'PROCESSING') ? (
                <div className="flex flex-col items-center space-y-4 animate-fade-in">
                    <button 
                        onClick={handleUserFinished}
                        disabled={status === 'PROCESSING'}
                        className={`group flex flex-col items-center space-y-3 focus:outline-none transition-all duration-500 ${status === 'PROCESSING' ? 'opacity-50 grayscale scale-90 cursor-default' : 'opacity-100 cursor-pointer'}`}
                    >
                        <div className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white transition-all duration-300 flex items-center justify-center group-active:scale-95 shadow-2xl">
                            {status === 'PROCESSING' ? (
                                <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
                            ) : (
                                <SquareIcon />
                            )}
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/30 group-hover:text-white transition-colors">
                            {status === 'PROCESSING' ? 'Thinking...' : 'Stop & Send'}
                        </span>
                    </button>
                </div>
            ) : status === 'SPEAKING' ? (
                <div className="flex flex-col items-center space-y-3 animate-fade-in">
                     <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_#ef4444]"></div>
                     <span className="text-[11px] font-mono uppercase tracking-[0.4em] text-white/50">{preset.aiName} is speaking...</span>
                </div>
            ) : null}
         </div>
      </main>

      {error && <div className="absolute bottom-10 px-6 py-3 bg-red-900/60 border border-red-500/50 rounded-full text-xs text-red-100 backdrop-blur-md animate-fade-in shadow-2xl">{error}</div>}
    </div>
  );
}