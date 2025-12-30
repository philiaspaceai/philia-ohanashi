
import { Language, VoiceModel, PitchMode, Preset } from './types';

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'default-1',
    name: 'Ohanashi Default',
    aiNickname: 'Hana',
    voiceModel: VoiceModel.KORE,
    language: Language.INDONESIA,
    systemInstruction: 'Kamu adalah teman bicara yang hangat dan penuh empati.',
    pitch: PitchMode.NORMAL,
    temperature: 0.7,
    advancedMode: false,
    // Added missing advancedVocal property to satisfy the Preset type
    advancedVocal: {
      texture: [],
      breathing: [],
      expression: []
    },
    createdAt: Date.now(),
  }
];

export const APP_TITLE = 'お話';
export const APP_NAME = 'Ohanashi';

export const ADVANCED_INSTRUCTION_OVERRIDE = `
[TECHNICAL_VIRTUAL_VOCAL_STYLE]: 
- Deliver speech with high naturalness including subtle breath sounds.
- If applicable, use a slight husky or raspy texture to the voice.
- Vary vocal pressure and pitch contour dynamically to avoid robotic monotony.
- Add realistic conversational fillers (e.g., "umm", "well") sparingly where it sounds natural.
- Ensure strict adherence to the requested language phonetics.
`;
