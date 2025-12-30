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
const StopIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>;
const MicOffIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" /></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const SparklesIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
const MicOnIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;

// --- VIEW TYPES ---
type View = 'DASHBOARD' | 'EDITOR' | 'SESSION';
type SessionStatus = 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'RECONNECTING' | 'ERROR';

export default function App() {
  const [view, setView] = useState<View>('DASHBOARD');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePreset, setActivePreset] = useState<Preset>(INITIAL_PRESET);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Editor State
  const [editData, setEditData] = useState<Preset>(INITIAL_PRESET);

  // Load Presets from DB
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

  // --- HANDLERS ---

  const handleCreateNew = () => {
    setEditData({ ...INITIAL_PRESET, id: uuidv4(), createdAt: Date.now() });
    setView('EDITOR');
  };

  const handleEdit = (preset: Preset) => {
    setEditData(preset);
    setView('EDITOR');
  };

  const confirmDelete = () => {
    setIsDeleteModalOpen(true);
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

  // --- RENDERERS ---

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-hidden relative">
      
      {/* BACKGROUND (Optional subtle texture) */}
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
          onDelete={confirmDelete}
        />
      )}

      {/* SESSION VIEW with Slide-Up Transition */}
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

// --- SUB-COMPONENTS ---

function Dashboard({ presets, onCreate, onEdit, onStart }: any) {
  return (
    <div className="h-screen flex flex-col p-6 md:p-12 animate-fade-in relative overflow-y-auto">
      <header className="mb-12 flex flex-col items-center justify-center">
         {/* Main Title - English */}
         <h1 className="font-display text-5xl md:text-6xl tracking-wider text-black border-b-2 border-black pb-2 mb-3">Ohanashi</h1>
         
         {/* Community Credit Link */}
         <a 
           href="https://philiaspace.com" 
           target="_blank" 
           rel="noopener noreferrer"
           className="group flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-gray-400 hover:text-black transition-colors duration-300 font-mono"
         >
           <span>Dibuat oleh Philia Space Community</span>
           <svg 
             className="w-3 h-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" 
             fill="none" 
             stroke="currentColor" 
             viewBox="0 0 24 24"
           >
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
           </svg>
         </a>
      </header>

      {/* GRID LAYOUT CONTAINER (Replaces the List Box) */}
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
                 {/* Card Header */}
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

                 {/* Card Actions */}
                 <div className="mt-8 flex items-center gap-3">
                    <button 
                       onClick={() => onStart(p)}
                       className="flex-1 bg-black text-white py-3 rounded-lg font-medium text-sm uppercase tracking-widest hover:bg-gray-800 active:scale-95 transition-all shadow-md group-hover:shadow-lg flex items-center justify-center gap-2"
                    >
                       <span>Start Talking</span>
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                    
                    <button 
                       onClick={() => onEdit(p)}
                       className="p-3 text-gray-400 hover:text-black border border-transparent hover:border-gray-200 rounded-lg transition-all"
                       title="Edit Configuration"
                    >
                       <EditIcon />
                    </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        onClick={onCreate}
        className="fixed bottom-8 right-8 w-16 h-16 bg-black text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform z-20"
      >
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

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Preset Name</label>
              <input 
                type="text" 
                value={data.name} 
                onChange={e => update('name', e.target.value)}
                className="w-full text-2xl font-serif border-b border-gray-300 focus:border-black outline-none py-2 bg-transparent placeholder-gray-300"
                placeholder="My Assistant"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">AI Name (Persona)</label>
              <input 
                type="text" 
                value={data.aiName} 
                onChange={e => update('aiName', e.target.value)}
                className="w-full text-lg border-b border-gray-300 focus:border-black outline-none py-1 bg-transparent"
                placeholder="e.g. Jarvis"
              />
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Voice Model</label>
              <select 
                value={data.voice} 
                onChange={e => update('voice', e.target.value)}
                className="w-full p-2 bg-gray-50 rounded-lg border-none focus:ring-1 focus:ring-black"
              >
                {Object.values(VoiceModel).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Language Lock</label>
              <select 
                value={data.language} 
                onChange={e => update('language', e.target.value)}
                className="w-full p-2 bg-gray-50 rounded-lg border-none focus:ring-1 focus:ring-black"
              >
                {Object.values(SupportedLanguage).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">System Instruction</label>
             <textarea 
               value={data.systemInstruction}
               onChange={e => update('systemInstruction', e.target.value)}
               className="w-full h-32 p-3 bg-gray-50 rounded-lg border-none focus:ring-1 focus:ring-black resize-none text-sm"
               placeholder="Define the behavior..."
             />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs uppercase tracking-wider text-gray-500">Temperature</label>
              <span className="text-xs font-mono">{data.temperature}</span>
            </div>
            <input 
              type="range" min="0" max="2" step="0.1"
              value={data.temperature}
              onChange={e => update('temperature', parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>

          {/* Advanced Toggle */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg">Advanced Mode</h3>
                <p className="text-xs text-gray-400">Deep acoustic & linguistic control</p>
              </div>
              <button 
                onClick={() => update('advancedModeEnabled', !data.advancedModeEnabled)}
                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${data.advancedModeEnabled ? 'bg-black' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${data.advancedModeEnabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            {data.advancedModeEnabled && (
              <AdvancedEditor 
                settings={data.advancedSettings} 
                onChange={(s: any) => update('advancedSettings', s)} 
              />
            )}
          </div>

        </div>
      </div>

      <div className="p-6 border-t border-gray-100">
        <button 
          onClick={onSave}
          className="w-full py-4 bg-black text-white font-medium uppercase tracking-widest text-sm hover:bg-gray-900 transition-colors rounded-none"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}

function LiveSession({ preset, onClose }: { preset: Preset, onClose: () => void }) {
  const [status, setStatus] = useState<SessionStatus>('CONNECTING');
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const loggerRef = useRef<SessionLogger | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5; 
  const isConnectedRef = useRef(false);

  // Time-Scheduled Playback State
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeSourceCountRef = useRef(0); 
  
  // Wake Lock Ref
  const wakeLockRef = useRef<any>(null);

  // Helper to sync state changes with logger
  const updateStatus = (newStatus: SessionStatus) => {
    setStatus(newStatus);
    loggerRef.current?.logStateChange(newStatus);
  };

  useEffect(() => {
    loggerRef.current = new SessionLogger();
    loggerRef.current.addLog('INFO', `Initializing Session for: ${preset.name}`);
    retryCountRef.current = 0;
    isConnectedRef.current = false;
    nextStartTimeRef.current = 0;
    activeSourcesRef.current = new Set();
    activeSourceCountRef.current = 0;

    let active = true;

    // --- WAKE LOCK (PREVENT ERROR 1006 ON MOBILE) ---
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          loggerRef.current?.addLog('INFO', 'Screen Wake Lock active');
        }
      } catch (err) {
        loggerRef.current?.addLog('INFO', 'Wake Lock skipped/failed');
      }
    };
    requestWakeLock();

    // Re-acquire wake lock if visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current && active) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const cleanUpResources = () => {
       isConnectedRef.current = false;
       if (wakeLockRef.current) {
         wakeLockRef.current.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
       }
       if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
       }
    };

    const stopAllAudio = () => {
       activeSourcesRef.current.forEach(source => {
           try { source.stop(); } catch(e) {}
       });
       activeSourcesRef.current.clear();
       activeSourceCountRef.current = 0;
       nextStartTimeRef.current = 0;
       if (active) updateStatus('LISTENING');
    };

    const startSession = async () => {
      if (!active) return;
      
      let inputAudioContext: AudioContext | null = null;
      let outputAudioContext: AudioContext | null = null;
      let stream: MediaStream | null = null;
      let sessionPromise: Promise<any> | null = null;
      
      cleanUpResources();

      try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
          throw new Error("API Key missing. Check Vercel Env Vars.");
        }

        const ai = new GoogleGenAI({ apiKey });
        loggerRef.current?.logConnectionAttempt();
        
        // --- AUDIO SETUP ---
        inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        await Promise.all([inputAudioContext.resume(), outputAudioContext.resume()]);

        const analyserNode = outputAudioContext.createAnalyser();
        analyserNode.fftSize = 64;
        setAnalyser(analyserNode);

        const outputNode = outputAudioContext.createGain();
        outputNode.connect(analyserNode);
        analyserNode.connect(outputAudioContext.destination);

        // --- INPUT SETUP (BUFFERING) ---
        stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        
        const source = inputAudioContext.createMediaStreamSource(stream);
        // REDUCED BUFFER SIZE: 2048 samples @ 16kHz = ~128ms latency
        const scriptProcessor = inputAudioContext.createScriptProcessor(2048, 1, 1);
        
        const inputSampleRate = inputAudioContext.sampleRate;
        const systemInstruction = buildSystemInstruction(preset);
        
        sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025', 
          callbacks: {
            onopen: () => {
              if (!active) return;
              loggerRef.current?.logConnectionOpen();
              updateStatus('LISTENING');
              setError(null);
              retryCountRef.current = 0; 
              isConnectedRef.current = true;
              
              // Reset Output Timing
              nextStartTimeRef.current = outputAudioContext!.currentTime;

              scriptProcessor.onaudioprocess = (e) => {
                 // HALF-DUPLEX LOGIC WITH SILENCE HEARTBEAT:
                 if (!active || !isConnectedRef.current) return;
                 
                 const inputData = e.inputBuffer.getChannelData(0);
                 
                 let chunk: Float32Array;
                 let isSilence = false;

                 if (activeSourceCountRef.current > 0) {
                     // AI IS SPEAKING: Send SILENCE (Heartbeat) to keep connection alive.
                     // EFFECTIVELY MUTES THE USER
                     chunk = new Float32Array(inputData.length).fill(0);
                     isSilence = true;
                 } else {
                     // AI IS LISTENING: Send actual microphone data.
                     chunk = new Float32Array(inputData);
                 }

                 const pcmBlob = createPcmBlob(chunk, inputSampleRate);
                 
                 sessionPromise?.then(session => {
                    // Log Send Operation with Size
                    loggerRef.current?.logAudioSend(pcmBlob.data.length, isSilence);
                    session.sendRealtimeInput({ media: pcmBlob });
                 }).catch(e => {});
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext!.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (!active) return;
              
              const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio && outputAudioContext) {
                // Log Receive
                loggerRef.current?.logAudioReceive(base64Audio.length);

                try {
                  const audioBuffer = await decodeAudioData(
                    base64ToUint8Array(base64Audio),
                    outputAudioContext
                  );
                  
                  // --- TIME SCHEDULING (CRITICAL FOR SMOOTH AUDIO) ---
                  const currentTime = outputAudioContext.currentTime;
                  
                  // If we fell behind, reset cursor to now.
                  if (nextStartTimeRef.current < currentTime) {
                      nextStartTimeRef.current = currentTime;
                  }
                  
                  const source = outputAudioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputNode);
                  
                  source.start(nextStartTimeRef.current);
                  
                  // Register Source
                  activeSourcesRef.current.add(source);
                  activeSourceCountRef.current++;
                  updateStatus('SPEAKING'); 

                  // Advance cursor
                  nextStartTimeRef.current += audioBuffer.duration;

                  source.onended = () => {
                      activeSourcesRef.current.delete(source);
                      activeSourceCountRef.current--;
                      if (activeSourceCountRef.current === 0 && active) {
                          updateStatus('LISTENING');
                      }
                  };

                } catch (decodeErr: any) {
                   loggerRef.current?.addLog('ERROR', 'Audio Decode Failure', decodeErr);
                }
              }

              if (msg.serverContent?.interrupted) {
                loggerRef.current?.addLog('INTERRUPT', 'Interruption Signal Received');
                stopAllAudio();
                if (outputAudioContext) {
                    nextStartTimeRef.current = outputAudioContext.currentTime;
                }
              }
            },
            onclose: (e) => {
               if (!active) return;
               isConnectedRef.current = false;
               
               // ENHANCED ERROR LOGGING
               loggerRef.current?.logErrorContext(e, e.code);
               
               if (retryCountRef.current < MAX_RETRIES) {
                   updateStatus('RECONNECTING');
                   retryCountRef.current += 1;
                   setTimeout(() => { if (active) startSession(); }, 500);
               } else {
                   updateStatus('ERROR');
                   setError("Connection lost.");
               }
            },
            onerror: (err: any) => {
               loggerRef.current?.logErrorContext(err);
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: preset.voice } }
            },
            systemInstruction: systemInstruction,
            generationConfig: {
              temperature: preset.temperature,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          }
        });

        cleanupRef.current = () => {
           isConnectedRef.current = false;
           if(stream) stream.getTracks().forEach(t => t.stop());
           
           if(source) try { source.disconnect(); } catch {}
           if(scriptProcessor) try { scriptProcessor.disconnect(); } catch {}
           
           if(inputAudioContext && inputAudioContext.state !== 'closed') inputAudioContext.close();
           if(outputAudioContext && outputAudioContext.state !== 'closed') outputAudioContext.close();
           
           if(sessionPromise) sessionPromise.then(s => s.close()).catch(() => {});
           
           stopAllAudio();
        };

      } catch (e: any) {
        if (active) {
            updateStatus('ERROR');
            setError(e.message || "Failed to start session");
        }
      }
    };

    startSession();

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanUpResources();
    };
  }, [preset]);

  const downloadLog = () => { loggerRef.current?.download(); };
  const getStatusText = () => {
      switch(status) {
          case 'CONNECTING': return "Connecting...";
          case 'LISTENING': return "Your Turn";
          case 'SPEAKING': return `Listen to ${preset.aiName}...`; 
          case 'RECONNECTING': return "Reconnecting...";
          case 'ERROR': return "Connection Failed";
          default: return "";
      }
  }

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
         <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
         <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
      </div>

      <header className="absolute top-0 left-0 w-full flex justify-between items-center p-8 z-50">
         <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
         <span className="font-mono text-xs tracking-[0.2em] text-white/50 uppercase">{preset.language} MODE</span>
         <div className="flex items-center space-x-3">
             <button onClick={downloadLog} className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 text-[10px] uppercase tracking-widest border border-white/10 backdrop-blur-sm">LOG</button>
             
             {/* Status Dot */}
             <div className={`w-2 h-2 rounded-full transition-all duration-300
               ${status === 'LISTENING' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 
                 status === 'SPEAKING' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 
                 status === 'RECONNECTING' ? 'bg-yellow-500 animate-ping' : 'bg-red-500'}`} 
             />
         </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full z-10 space-y-12">
         <div className="text-center cursor-pointer group p-4 rounded-2xl hover:bg-white/5 transition-all select-none flex flex-col items-center space-y-6" onClick={downloadLog}>
            <h2 className="font-display text-4xl md:text-5xl group-hover:text-white transition-colors">{preset.aiName}</h2>
            
            {/* MIC STATUS INDICATOR */}
            <div className={`flex items-center gap-3 px-6 py-3 rounded-full border backdrop-blur-md transition-all duration-500 ${
                status === 'SPEAKING' 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
                    : status === 'LISTENING'
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/50'
            }`}>
                {status === 'SPEAKING' ? (
                    <>
                        <MicOffIcon />
                        <span className="text-sm font-bold tracking-[0.2em] uppercase">Mic Locked</span>
                    </>
                ) : status === 'LISTENING' ? (
                    <>
                         <MicOnIcon />
                        <span className="text-sm font-bold tracking-[0.2em] uppercase">Your Turn</span>
                    </>
                ) : (
                    <span className="text-sm font-bold tracking-[0.2em] uppercase">{getStatusText()}</span>
                )}
            </div>
         </div>

         {error && (
            <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm max-w-xs text-center animate-pulse">
               {error}
            </div>
         )}

         <div className="w-full max-w-sm h-32 flex items-center justify-center relative">
             <Visualizer analyser={analyser} isActive={status === 'SPEAKING' || status === 'LISTENING'} />
         </div>
      </main>

      <footer className="absolute bottom-0 w-full flex justify-center pb-8 z-10 items-center space-x-6">
         <button onClick={onClose} className="w-16 h-16 rounded-full bg-white/10 hover:bg-red-500/20 border border-white/20 hover:border-red-500 text-white transition-all flex items-center justify-center backdrop-blur-md">
            <StopIcon />
         </button>
      </footer>
    </div>
  );
}