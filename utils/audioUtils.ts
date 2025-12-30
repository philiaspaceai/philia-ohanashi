import { Blob } from '@google/genai';

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
  
  // Linear Interpolation for smoother downsampling (Anti-Crackling)
  for (let i = 0; i < newLength; i++) {
      const position = i * sampleRateRatio;
      const index = Math.floor(position);
      const fraction = position - index;
      
      if (index + 1 < buffer.length) {
          const val1 = buffer[index];
          const val2 = buffer[index + 1];
          // Linear interpolate between val1 and val2
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
    // Hard clamp to prevent clipping noise
    const s = Math.max(-1, Math.min(1, processedData[i]));
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

// --- NATURAL LANGUAGE MAPPERS (FOR ACTING INSTRUCTIONS ONLY) ---

function getPitchDirective(value: number): string {
  if (value >= 70) return "High-pitched, youthful, and energetic tone.";
  if (value >= 40) return "Neutral, natural mid-range pitch.";
  return "Deep, resonant, and mature tone.";
}

function getSpeedDirective(value: number): string {
  if (value >= 1.6) return "Speak extremely fast, almost manic.";
  if (value >= 1.2) return "Speak briskly and energetically.";
  if (value >= 0.9) return "Speak at a natural conversational pace.";
  return "Speak slowly, deliberately, and thoughtfully.";
}

function getEmotionDirective(tension: number): string {
  if (tension > 70) return "High tension: Sound anxious, excited, or stressed.";
  if (tension > 40) return "Neutral and calm.";
  return "Very relaxed, soothing, and loose.";
}

export const buildSystemInstruction = (preset: any): string => {
  let instruction = `You are playing the role of ${preset.aiName}.\n`;
  instruction += `LANGUAGE RULE: You MUST speak ONLY in ${preset.language}.\n`;
  
  if (preset.advancedModeEnabled) {
    const adv = preset.advancedSettings;
    instruction += `\n=== VOICE ACTING DIRECTIVES ===\n`;
    instruction += `ACTING PROFILE: Adopt the following vocal persona:\n`;
    instruction += `1. PITCH: ${getPitchDirective(adv.vocalTract.f0Median)}\n`;
    instruction += `2. SPEED: ${getSpeedDirective(adv.temporal.speechRate)}\n`;
    instruction += `3. VIBE: ${getEmotionDirective(adv.state.tension)}\n`;
    
    if (adv.persona.register === 'Falsetto') {
      instruction += `4. REGISTER: Use a light, head-voice register.\n`;
    }
  }

  instruction += `\n=== CHARACTER BACKGROUND ===\n`;
  instruction += preset.systemInstruction ? preset.systemInstruction : "You are a helpful assistant.";

  return instruction;
};