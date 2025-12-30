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
    // Smoother gain reduction and stricter clipping for input
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
      // Direct mapping with normalization
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const buildSystemInstruction = (preset: any): string => {
  let instruction = `You are playing the role of ${preset.aiName}.\n`;
  instruction += `LANGUAGE RULE: You MUST speak ONLY in ${preset.language}.\n`;
  
  instruction += `\n=== CHARACTER BACKGROUND ===\n`;
  instruction += preset.systemInstruction ? preset.systemInstruction : "You are a helpful assistant.";

  return instruction;
};