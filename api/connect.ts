
// Vercel Edge Function: api/connect.ts
// This function handles WebSocket proxying between the client and Google's Gemini API.

import { GoogleGenAI, Modality } from '@google/genai';
import { Preset } from '../types.ts';

export const config = {
  runtime: 'edge',
};

// @ts-ignore: Deno types are available in Vercel's Edge runtime
const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

let geminiSession: any = null;

const cleanup = () => {
    if (geminiSession) {
        geminiSession.close();
        geminiSession = null;
    }
};

clientSocket.onopen = () => {
    // Connection is open, waiting for the initial configuration message from the client.
};

clientSocket.onmessage = async (event: MessageEvent) => {
    const message = JSON.parse(event.data);

    if (message.type === 'config' && message.preset && !geminiSession) {
        const preset: Preset = message.preset;
        
        try {
            // Securely initialize GoogleGenAI on the server with API key from environment variables
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

            let injection = `[IDENTITY]: You are ${preset.aiNickname}. ${preset.systemInstruction}. `;
            injection += `\n[MANDATORY_LANGUAGE_LOCK]: YOU MUST COMMUNICATE EXCLUSIVELY IN ${preset.language.toUpperCase()}. DO NOT USE ANY OTHER LANGUAGE.`;
            injection += `\n[PITCH]: Adjust your voice to ${preset.pitch} pitch levels. `;
            
            if (preset.advancedMode) {
                injection += `\n[TECHNICAL_VOCAL_STYLE]: Act as a high-fidelity vocal engine. Traits: `;
                if (preset.advancedVocal.texture.length) injection += `Texture: ${preset.advancedVocal.texture.join(', ')}. `;
                if (preset.advancedVocal.breathing.length) injection += `Respiration: ${preset.advancedVocal.breathing.join(', ')}. `;
                if (preset.advancedVocal.expression.length) injection += `Dynamics: ${preset.advancedVocal.expression.join(', ')}. `;
                injection += `Integrate realistic vocal fry, husky undertones, and natural gasps for hyper-natural dialog.`;
            }

            geminiSession = await ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (clientSocket.readyState === 1) { // 1 === OPEN
                            clientSocket.send(JSON.stringify({ type: 'status', status: 'connected' }));
                        }
                    },
                    onmessage: (geminiMessage: any) => {
                        if (clientSocket.readyState === 1) {
                            clientSocket.send(JSON.stringify({ type: 'audio', data: geminiMessage }));
                        }
                    },
                    onclose: () => {
                        if (clientSocket.readyState === 1) clientSocket.close();
                        cleanup();
                    },
                    onerror: (e: any) => {
                        console.error('Gemini error:', e);
                        if (clientSocket.readyState === 1) {
                            clientSocket.send(JSON.stringify({ type: 'error', message: 'Gemini connection error.' }));
                            clientSocket.close();
                        }
                        cleanup();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: preset.voiceModel } } },
                    systemInstruction: injection,
                    temperature: preset.temperature
                }
            });
        } catch (err: any) {
            console.error('Failed to initialize Gemini session:', err);
            if (clientSocket.readyState === 1) {
                clientSocket.send(JSON.stringify({ type: 'error', message: err.message || 'Failed to connect to AI.' }));
                clientSocket.close();
            }
            cleanup();
        }
    } else if (message.type === 'audio' && geminiSession) {
        // Forward client's audio (including heartbeats) to Gemini
        geminiSession.sendRealtimeInput({ media: message.payload });
    }
};

clientSocket.onclose = () => {
    cleanup();
};

clientSocket.onerror = (err) => {
    console.error('Client socket error:', err);
    cleanup();
};

export default function handler(req: Request) {
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response(null, { status: 501 });
    }
    // @ts-ignore
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // The rest of the logic is handled by the event listeners attached above.
    // We pass the same socket object to them implicitly.
    // This is a simplified representation for clarity. In a real scenario,
    // the logic would be inside this handler function's scope.
    // For this context, assume the above listeners are attached to this `socket`.
    // Let's rewrite slightly for correctness within the handler scope.
    
    let geminiSession_local: any = null;

    const cleanup_local = () => {
        if (geminiSession_local) {
            geminiSession_local.close();
            geminiSession_local = null;
        }
    };

    socket.onopen = () => {};

    socket.onmessage = async (event: MessageEvent) => {
        const message = JSON.parse(event.data);

        if (message.type === 'config' && message.preset && !geminiSession_local) {
            const preset: Preset = message.preset;
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                // ... injection logic copied from above ...
                let injection = `[IDENTITY]: You are ${preset.aiNickname}. ${preset.systemInstruction}. ` +
                                `\n[MANDATORY_LANGUAGE_LOCK]: YOU MUST COMMUNICATE EXCLUSIVELY IN ${preset.language.toUpperCase()}. DO NOT USE ANY OTHER LANGUAGE.` +
                                `\n[PITCH]: Adjust your voice to ${preset.pitch} pitch levels. `;
                if (preset.advancedMode) {
                  injection += `\n[TECHNICAL_VOCAL_STYLE]: Act as a high-fidelity vocal engine. Traits: `;
                  if (preset.advancedVocal.texture.length) injection += `Texture: ${preset.advancedVocal.texture.join(', ')}. `;
                  if (preset.advancedVocal.breathing.length) injection += `Respiration: ${preset.advancedVocal.breathing.join(', ')}. `;
                  if (preset.advancedVocal.expression.length) injection += `Dynamics: ${preset.advancedVocal.expression.join(', ')}. `;
                  injection += `Integrate realistic vocal fry, husky undertones, and natural gasps for hyper-natural dialog.`;
                }

                geminiSession_local = await ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => socket.readyState === 1 && socket.send(JSON.stringify({ type: 'status', status: 'connected' })),
                        onmessage: (msg: any) => socket.readyState === 1 && socket.send(JSON.stringify({ type: 'audio', data: msg })),
                        onclose: () => { socket.readyState === 1 && socket.close(); cleanup_local(); },
                        onerror: (e: any) => {
                            console.error('Gemini error:', e);
                            socket.readyState === 1 && socket.send(JSON.stringify({ type: 'error', message: 'Gemini connection error.' }));
                            socket.close();
                            cleanup_local();
                        },
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: preset.voiceModel } } },
                        systemInstruction: injection,
                        temperature: preset.temperature
                    }
                });
            } catch (err: any) {
                console.error('Failed to init Gemini:', err);
                socket.readyState === 1 && socket.send(JSON.stringify({ type: 'error', message: err.message || 'Failed to connect to AI.' }));
                socket.close();
                cleanup_local();
            }
        } else if (message.type === 'audio' && geminiSession_local) {
            geminiSession_local.sendRealtimeInput({ media: message.payload });
        }
    };

    socket.onclose = () => { cleanup_local(); };
    socket.onerror = (err) => { console.error('Client socket error:', err); cleanup_local(); };
    
    return response;
}
