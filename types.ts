export enum SupportedLanguage {
  INDONESIAN = 'Bahasa Indonesia',
  ENGLISH = 'English',
  JAPANESE = 'Japanese'
}

export enum VoiceModel {
  PUCK = 'Puck',
  CHARON = 'Charon',
  KORE = 'Kore',
  FENRIR = 'Fenrir',
  ZEPHYR = 'Zephyr'
}

// Hierarchical structure for Advanced Mode to match UI grouping
export interface AdvancedSettings {
  // 1. Acoustic Signal Modeling
  vocalTract: {
    f0Median: number; // 0-100 (Deep to High)
    formantScaling: number; // 0-100 (Dark to Bright)
    lengthSimulation: number; // 0-100 (Short to Long)
  };
  glottalSource: {
    vocalEffort: number; // 0-100 (Soft to Loud)
    breathiness: number; // 0-100 (Pressed to Breathy)
    hnr: number; // 0-100 (Noisy to Harmonic)
  };
  spectral: {
    tilt: number; // 0-100 (Flat to Steep)
    aspiration: number; // 0-100 (Clean to Noisy)
    shimmerJitter: number; // 0-100 (Stable to Unstable)
  };

  // 2. Prosodic & Temporal Modeling
  temporal: {
    speechRate: number; // 0.5 to 2.0
    macroPausing: boolean; // Toggle
  };
  intonation: {
    dynamicRange: 'Narrow' | 'Normal' | 'Wide';
    emphaticStress: number; // 0-100
    boundaryTones: 'Rising' | 'Falling' | 'Flat';
  };
  rhythm: {
    spacing: 'Staccato' | 'Natural' | 'Legato';
  };

  // 3. Linguistic & Articulatory Style
  enunciation: {
    precision: number; // 0-100 (Slurred to Crisp)
    consonantForce: number; // 0-100 (Weak to Explosive)
  };
  inflection: {
    tonalInflection: 'Dipping' | 'Normal' | 'Rising';
  };

  // 4. Emotional & Somatic Markers
  state: {
    tension: number; // 0-100 (Relaxed to Tense)
  };
  persona: {
    register: 'Modal' | 'Falsetto' | 'Vocal Fry';
  };
}

export interface Preset {
  id: string;
  name: string;
  aiName: string;
  voice: VoiceModel;
  language: SupportedLanguage;
  systemInstruction: string;
  browserPitch: number; // Updated: 1-11 scale (6 is normal)
  temperature: number;
  advancedModeEnabled: boolean;
  advancedSettings: AdvancedSettings;
  createdAt: number;
}

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  vocalTract: { f0Median: 50, formantScaling: 50, lengthSimulation: 50 },
  glottalSource: { vocalEffort: 50, breathiness: 20, hnr: 80 },
  spectral: { tilt: 50, aspiration: 10, shimmerJitter: 5 },
  temporal: { speechRate: 1.0, macroPausing: true },
  intonation: { dynamicRange: 'Normal', emphaticStress: 50, boundaryTones: 'Falling' },
  rhythm: { spacing: 'Natural' },
  enunciation: { precision: 80, consonantForce: 50 },
  inflection: { tonalInflection: 'Normal' },
  state: { tension: 40 },
  persona: { register: 'Modal' }
};

export const INITIAL_PRESET: Preset = {
  id: '',
  name: '',
  aiName: 'AI',
  voice: VoiceModel.KORE,
  language: SupportedLanguage.ENGLISH,
  systemInstruction: '',
  browserPitch: 6,
  temperature: 0.7,
  advancedModeEnabled: false,
  advancedSettings: DEFAULT_ADVANCED_SETTINGS,
  createdAt: Date.now()
};