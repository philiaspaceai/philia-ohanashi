import { Blob } from '@google/genai';
import { Preset } from '../types';

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
  if (outputRate === inputRate) {
    return buffer;
  }
  
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
      const position = i * sampleRateRatio;
      const index = Math.floor(position);
      const fraction = position - index;
      
      if (index + 1 < buffer.length) {
          const val1 = buffer[index];
          const val2 = buffer[index + 1];
          result[i] = val1 + (val2 - val1) * fraction;
      } else {
          result[i] = buffer[index];
      }
  }
  return result;
}

export function createPcmBlob(data: Float32Array, inputSampleRate: number): Blob {
  const processedData = downsampleBuffer(data, inputSampleRate, 16000);

  const l = processedData.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, processedData[i] * 0.9));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Transforms numerical settings into descriptive technical instructions for the model.
 * This is hidden from the user configuration field but included in the API prompt.
 */
export const buildSystemInstruction = (preset: Preset): string => {
  let instruction = `You are playing the role of ${preset.aiName}.\n`;
  instruction += `LANGUAGE RULE: You MUST speak ONLY in ${preset.language}.\n`;
  
  instruction += `\n=== PERSONALITY & CHARACTER ===\n`;
  instruction += preset.systemInstruction ? preset.systemInstruction : "You are a helpful assistant.";

  // --- HIDDEN TECHNICAL GUIDELINES ---
  instruction += `\n\n=== TECHNICAL SPEECH CONFIGURATION (INTERNAL) ===\n`;
  instruction += `These are your acoustic constraints. Adapt your speech generation to match:\n`;
  
  const s = preset.advancedSettings;
  
  // Prosody
  instruction += `- SPEECH RATE: ${s.temporal.speechRate.toFixed(2)}x speed. ${s.temporal.speechRate > 1.2 ? 'Speak rapidly.' : s.temporal.speechRate < 0.8 ? 'Speak slowly and deliberately.' : 'Maintain natural pace.'}\n`;
  if (s.temporal.macroPausing) instruction += `- Use frequent, natural pauses between sentences.\n`;
  
  // Acoustic
  const pitchDesc = s.vocalTract.f0Median > 70 ? 'high-pitched' : s.vocalTract.f0Median < 30 ? 'deep-toned' : 'neutral-pitched';
  instruction += `- PITCH: Aim for a ${pitchDesc} resonance.\n`;
  
  const effortDesc = s.glottalSource.vocalEffort > 70 ? 'forceful and energetic' : s.glottalSource.vocalEffort < 30 ? 'soft and gentle' : 'standard';
  instruction += `- VOCAL EFFORT: Use ${effortDesc} projection.\n`;
  
  if (s.glottalSource.breathiness > 60) instruction += `- Add a whispery, breathy quality to your voice.\n`;
  
  // Style
  if (s.enunciation.precision > 80) instruction += `- ENUNCIATION: Be extremely crisp and clear with consonants.\n`;
  if (s.rhythm.spacing === 'Staccato') instruction += `- RHYTHM: Use clipped, separated speech segments.\n`;
  if (s.rhythm.spacing === 'Legato') instruction += `- RHYTHM: Flow words smoothly into one another.\n`;
  
  instruction += `- DYNAMIC RANGE: ${s.intonation.dynamicRange} variation in volume.\n`;
  instruction += `- VOCAL REGISTER: Use ${s.persona.register} register predominantly.\n`;

  return instruction;
};