
export enum Language {
  INDONESIA = 'Indonesia',
  ENGLISH = 'English',
  JAPAN = 'Japanese'
}

export enum VoiceModel {
  ZEPHYR = 'Zephyr',
  PUCK = 'Puck',
  CHARON = 'Charon',
  KORE = 'Kore',
  FENRIR = 'Fenrir'
}

export enum PitchMode {
  LOW = 'Low',
  NORMAL = 'Normal',
  HIGH = 'High'
}

export interface AdvancedVocalSettings {
  texture: string[]; // ['husky', 'hoarse', 'soft', 'deep']
  breathing: string[]; // ['heavy', 'subtle', 'frequent_pauses']
  expression: string[]; // ['tension', 'relaxed', 'dynamic']
}

export interface Preset {
  id: string;
  name: string;
  aiNickname: string;
  voiceModel: VoiceModel;
  language: Language;
  systemInstruction: string;
  pitch: PitchMode;
  temperature: number;
  advancedMode: boolean;
  advancedVocal: AdvancedVocalSettings;
  createdAt: number;
}

export type AppState = 'home' | 'chat';

export type ConnectionStatus = 
  | 'Idle' 
  | 'Connecting...' 
  | 'Connected' 
  | 'Reconnecting...' 
  | 'Interrupted' 
  | 'Error';
