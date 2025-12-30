
import { useState, useRef, useCallback, useEffect } from 'react';
import { Preset, ConnectionStatus, LogEntry } from '../types.ts';
import { decode, decodeAudioData, createPcmBlob, createSilentPcmPayload } from '../utils/audioUtils.ts';

const RECONNECT_INTERVALS = [1000, 2000, 5000, 10000]; // in ms
const HEARTBEAT_INTERVAL = 4000; // in ms

export const useOhanashi = () => {
  const [status, _setStatus] = useState<ConnectionStatus>('Idle');
  const [audioActive, _setAudioActive] = useState(false);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const presetRef = useRef<Preset | null>(null);
  const reconnectAttemptRef = useRef(0);
  const logsRef = useRef<LogEntry[]>([]);
  const sessionStartTimeRef = useRef<number | null>(null);
  
  const addLog = useCallback((event: string, details: any = {}) => {
    logsRef.current.push({
      timestamp: new Date().toISOString(),
      event,
      details
    });
  }, []);

  const setStatus = useCallback((newStatus: ConnectionStatus) => {
    addLog('STATUS_CHANGED', { from: statusRef.current, to: newStatus });
    _setStatus(newStatus);
  }, [addLog]);

  const setAudioActive = useCallback((isActive: boolean) => {
    _setAudioActive(currentIsActive => {
      if (currentIsActive !== isActive) {
        addLog(isActive ? 'AI_SPEAKING_START' : 'AI_SPEAKING_END');
        return isActive;
      }
      return currentIsActive;
    });
  }, [addLog]);


  const cleanupAudioPlayback = useCallback(() => {
    sourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setAudioActive(false);
    
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        addLog('AUDIO_CONTEXT_CLOSING', { state: audioContextRef.current.state });
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
  }, [setAudioActive, addLog]);

  const stopSession = useCallback(() => {
    // Set status to idle immediately to prevent reconnects
    setStatus('Idle');
    addLog('SESSION_STOP_REQUESTED');

    if (sessionStartTimeRef.current) {
        const duration = (Date.now() - sessionStartTimeRef.current) / 1000;
        addLog('SESSION_DURATION_CALCULATED', { durationSeconds: duration.toFixed(2) });
        sessionStartTimeRef.current = null;
    }

    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    
    if (wsRef.current) {
        wsRef.current.onclose = null; 
        wsRef.current.close(1000, "User initiated disconnect");
        wsRef.current = null;
    }
    
    if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    
    cleanupAudioPlayback();
    addLog('SESSION_ENDED_CLEANUP_COMPLETE');
    reconnectAttemptRef.current = 0;
  }, [cleanupAudioPlayback, addLog, setStatus]);

  const connect = useCallback(() => {
    if (!presetRef.current) {
        addLog('ERROR_NO_PRESET');
        return;
    }
    
    addLog('WEBSOCKET_CONNECT_ATTEMPT', { url: `wss://${window.location.host}/api/connect` });
    const ws = new WebSocket(`wss://${window.location.host}/api/connect`);
    wsRef.current = ws;

    setStatus('Connecting...');

    ws.onopen = () => {
      addLog('WEBSOCKET_OPENED', { protocol: ws.protocol, extensions: ws.extensions });
      reconnectAttemptRef.current = 0;
      ws.send(JSON.stringify({ type: 'config', preset: presetRef.current }));
      
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
              addLog('HEARTBEAT_SENT');
              const silentPayload = createSilentPcmPayload();
              ws.send(JSON.stringify({ type: 'audio', payload: silentPayload }));
          }
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        addLog('WEBSOCKET_MESSAGE_RECEIVED', { type: message.type });

        if (message.type === 'status' && message.status === 'connected') {
            addLog('GEMINI_SESSION_CONNECTED');
            setStatus('Connected');
        } else if (message.type === 'audio' && message.data.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
            setAudioActive(true);
            const b64 = message.data.serverContent.modelTurn.parts[0].inlineData.data;
            addLog('AUDIO_CHUNK_RECEIVED', { size: b64.length, currentQueueSize: sourcesRef.current.size });

            const outputCtx = audioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            
            const buffer = await decodeAudioData(decode(b64), outputCtx, 24000, 1);
            addLog('AUDIO_CHUNK_DECODED', { durationMs: buffer.duration * 1000 });
            
            const source = outputCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outputCtx.destination);
            source.onended = () => {
              sourcesRef.current.delete(source);
              if (sourcesRef.current.size === 0) {
                setAudioActive(false);
              }
            };
            addLog('PLAYBACK_SCHEDULED', { startTime: nextStartTimeRef.current, audioCtxTime: outputCtx.currentTime });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
        } else if (message.type === 'error') {
            addLog('ERROR_FROM_SERVER', { message: message.message });
            setStatus('Error');
            stopSession();
        }
    };

    ws.onerror = (err) => {
        addLog('WEBSOCKET_ERROR', { error: JSON.stringify(err, Object.getOwnPropertyNames(err)) });
        setStatus('Error');
    };

    ws.onclose = (event: CloseEvent) => {
        addLog('WEBSOCKET_CLOSED', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        
        // This is the auto-reconnect logic. Use the ref for the most current state.
        if (event.code !== 1000 && statusRef.current !== 'Idle' && statusRef.current !== 'Error') { 
            addLog('RECONNECT_LOGIC_TRIGGERED', { currentStatus: statusRef.current });
            const delay = RECONNECT_INTERVALS[reconnectAttemptRef.current] || RECONNECT_INTERVALS[RECONNECT_INTERVALS.length - 1];
            addLog('RECONNECT_SCHEDULED', { attempt: reconnectAttemptRef.current + 1, delay });
            reconnectAttemptRef.current++;
            setStatus('Reconnecting...');
            reconnectTimeoutRef.current = window.setTimeout(connect, delay);
        } else {
             addLog('RECONNECT_LOGIC_SKIPPED', { currentStatus: statusRef.current });
        }
    };
  }, [stopSession, addLog, setStatus, setAudioActive]);


  const startSession = useCallback(async (preset: Preset) => {
    if (statusRef.current !== 'Idle') return;
    
    logsRef.current = []; // Clear logs for new session
    sessionStartTimeRef.current = Date.now();
    addLog('SESSION_START_REQUESTED', { preset });
    addLog('CLIENT_ENV_INFO', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`
    });
    presetRef.current = preset;
    
    try {
        addLog('MIC_ACCESS_REQUESTED');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {
            sampleRate: 16000,
            channelCount: 1,
        } });
        micStreamRef.current = stream;
        const trackSettings = stream.getAudioTracks()[0].getSettings();
        addLog('MIC_STREAM_ACQUIRED', { settings: trackSettings });

        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = outputCtx;
        addLog('AUDIO_CONTEXT_CREATED', { sampleRate: outputCtx.sampleRate, state: outputCtx.state });
        outputCtx.onstatechange = () => {
            addLog('AUDIO_CONTEXT_STATE_CHANGED', { state: outputCtx.state });
        };

        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = scriptProcessor;
        addLog('AUDIO_PROCESSOR_CREATED', { bufferSize: scriptProcessor.bufferSize });

        scriptProcessor.onaudioprocess = (e) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                const payload = createPcmBlob(inputData);
                // Reduce log spam by commenting this out or making it conditional
                // addLog('AUDIO_CHUNK_SENT', { size: payload.data.length, wsReadyState: wsRef.current.readyState });
                wsRef.current.send(JSON.stringify({ type: 'audio', payload }));
            }
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);

        connect();

    } catch (err: any) {
        addLog('ERROR_MIC_ACCESS_DENIED', { name: err.name, message: err.message });
        setStatus('Error');
    }
  }, [connect, addLog, setStatus]);
  
  const getLogs = useCallback(() => {
    return logsRef.current;
  }, []);

  useEffect(() => {
    return () => {
      // Ensure session is fully stopped on component unmount
      if (statusRef.current !== 'Idle') {
          stopSession();
      }
    };
  }, [stopSession]);

  return { status, audioActive, startSession, stopSession, getLogs };
};
