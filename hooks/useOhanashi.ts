
import { useState, useRef, useCallback, useEffect } from 'react';
import { Preset, ConnectionStatus } from '../types.ts';
import { decode, decodeAudioData, createPcmBlob, createSilentPcmPayload } from '../utils/audioUtils.ts';

const RECONNECT_INTERVALS = [1000, 2000, 5000, 10000]; // in ms
const HEARTBEAT_INTERVAL = 4000; // in ms

export const useOhanashi = () => {
  const [status, setStatus] = useState<ConnectionStatus>('Idle');
  const [audioActive, setAudioActive] = useState(false);

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

  const cleanupAudioPlayback = useCallback(() => {
    sourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setAudioActive(false);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  }, []);

  const stopSession = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    
    if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect logic from firing on manual close
        wsRef.current.close();
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
    setStatus('Idle');
    reconnectAttemptRef.current = 0;
  }, [cleanupAudioPlayback]);

  const connect = useCallback(() => {
    if (!presetRef.current) {
        console.error("Attempted to connect without a preset.");
        return;
    }
    
    const wsUrl = `wss://${window.location.host}/api/connect`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    setStatus('Connecting...');

    ws.onopen = () => {
      reconnectAttemptRef.current = 0; // Reset on successful connection
      // Send configuration to the proxy server
      ws.send(JSON.stringify({ type: 'config', preset: presetRef.current }));
      
      // Start heartbeat to keep connection alive
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
              const silentPayload = createSilentPcmPayload();
              ws.send(JSON.stringify({ type: 'audio', payload: silentPayload }));
          }
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'status' && message.status === 'connected') {
            setStatus('Connected');
        } else if (message.type === 'audio' && message.data.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
            setAudioActive(true);
            const outputCtx = audioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const b64 = message.data.serverContent.modelTurn.parts[0].inlineData.data;
            const buffer = await decodeAudioData(decode(b64), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outputCtx.destination);
            source.onended = () => {
              sourcesRef.current.delete(source);
              if (sourcesRef.current.size === 0) setAudioActive(false);
            };
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
        } else if (message.type === 'error') {
            console.error('Error from server:', message.message);
            setStatus('Error');
            stopSession();
        }
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setStatus('Error');
    };

    ws.onclose = () => {
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        
        // This is the auto-reconnect logic
        if (status !== 'Idle' && status !== 'Error') {
            const delay = RECONNECT_INTERVALS[reconnectAttemptRef.current] || RECONNECT_INTERVALS[RECONNECT_INTERVALS.length - 1];
            reconnectAttemptRef.current++;

            setStatus('Reconnecting...');
            reconnectTimeoutRef.current = window.setTimeout(connect, delay);
        }
    };
  }, [status, stopSession]);


  const startSession = useCallback(async (preset: Preset) => {
    if (status !== 'Idle') return;
    
    presetRef.current = preset;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {
            sampleRate: 16000,
            channelCount: 1,
        } });
        micStreamRef.current = stream;

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = scriptProcessor;

        scriptProcessor.onaudioprocess = (e) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                const payload = createPcmBlob(inputData);
                wsRef.current.send(JSON.stringify({ type: 'audio', payload }));
            }
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);

        connect();

    } catch (err) {
        console.error("Failed to get microphone access:", err);
        setStatus('Error');
    }
  }, [status, connect]);
  
  // Graceful shutdown on component unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return { status, audioActive, startSession, stopSession };
};
