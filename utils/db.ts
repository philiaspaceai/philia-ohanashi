import { Preset, VoiceModel, SupportedLanguage, DEFAULT_ADVANCED_SETTINGS } from '../types';

const DB_NAME = 'ohanashi_db';
const DB_VERSION = 1;
const STORE_NAME = 'presets';

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject('Database error: ' + (event.target as IDBOpenDBRequest).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const SEED_DATA: Preset[] = [
  {
    id: 'seed-hitoriko',
    name: 'Hitoriko',
    aiName: 'Hitoriko',
    voice: VoiceModel.KORE,
    language: SupportedLanguage.JAPANESE,
    systemInstruction: `あなたは「ヒトリコ」です。
【キャラクター設定】
・性格：超ポジティブでハイテンションな女子高生。
・声質：アニメ声で、キンキンするくらい高い。`,
    browserPitch: 4, 
    browserPitchEnabled: true,
    temperature: 1.2,
    advancedModeEnabled: true,
    advancedSettings: {
      ...DEFAULT_ADVANCED_SETTINGS,
      vocalTract: { f0Median: 100, formantScaling: 100, lengthSimulation: 0 },
      temporal: { speechRate: 1.26, macroPausing: false }, 
      persona: { register: 'Falsetto' }
    },
    createdAt: Date.now()
  },
  {
    id: 'seed-akane',
    name: 'Akane',
    aiName: 'Akane',
    voice: VoiceModel.KORE,
    language: SupportedLanguage.JAPANESE,
    systemInstruction: `あなたは「アカネ」です。
【キャラクター設定】
・性格：極めて穏やかで、包容力があるお姉さん。`,
    browserPitch: 2, 
    browserPitchEnabled: true,
    temperature: 0.7,
    advancedModeEnabled: true,
    advancedSettings: {
      ...DEFAULT_ADVANCED_SETTINGS,
      vocalTract: { f0Median: 80, formantScaling: 70, lengthSimulation: 30 },
      glottalSource: { vocalEffort: 30, breathiness: 70, hnr: 60 },
      temporal: { speechRate: 1.12, macroPausing: true }, 
      persona: { register: 'Falsetto' }
    },
    createdAt: Date.now() + 1
  },
  {
    id: 'seed-makoto', 
    name: 'Makoto',
    aiName: 'Makoto',
    voice: VoiceModel.PUCK, 
    language: SupportedLanguage.JAPANESE,
    systemInstruction: `あなたは「マコト」です。
【キャラクター設定】
・年齢：17歳の男子高校生。性格：熱血。`,
    browserPitch: 0, 
    browserPitchEnabled: true,
    temperature: 1.0, 
    advancedModeEnabled: true,
    advancedSettings: {
      ...DEFAULT_ADVANCED_SETTINGS,
      vocalTract: { f0Median: 50, formantScaling: 50, lengthSimulation: 50 },
      temporal: { speechRate: 1.0, macroPausing: false }, 
      persona: { register: 'Modal' }
    },
    createdAt: Date.now() + 2
  },
  {
    id: 'seed-rintaro',
    name: 'Rintarō',
    aiName: 'Rintarō',
    voice: VoiceModel.FENRIR, 
    language: SupportedLanguage.JAPANESE,
    systemInstruction: `あなたは「リンタロウ」です。
【キャラクター設定】
・年齢：20代半ば。性格：クール、知的。`,
    browserPitch: -3, 
    browserPitchEnabled: true,
    temperature: 0.7,
    advancedModeEnabled: true,
    advancedSettings: {
      ...DEFAULT_ADVANCED_SETTINGS,
      vocalTract: { f0Median: 20, formantScaling: 30, lengthSimulation: 80 },
      temporal: { speechRate: 0.84, macroPausing: true }, 
      persona: { register: 'Vocal Fry' } 
    },
    createdAt: Date.now() + 3
  }
];

export const initDB = async (): Promise<Preset[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const currentPresets = getAllRequest.result as Preset[];
      const currentIds = new Set(currentPresets.map(p => p.id));
      const missingSeeds = SEED_DATA.filter(seed => !currentIds.has(seed.id));
      
      if (missingSeeds.length > 0) {
        missingSeeds.forEach(seed => {
          store.add(seed);
          currentPresets.push(seed);
        });
        resolve(currentPresets);
      } else {
        resolve(currentPresets);
      }
    };
    getAllRequest.onerror = () => reject('Failed to load DB');
  });
};

export const getAllPresets = async (): Promise<Preset[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const savePreset = async (preset: Preset): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(preset);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deletePreset = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};