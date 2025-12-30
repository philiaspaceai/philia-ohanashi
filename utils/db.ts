import { Preset, VoiceModel, SupportedLanguage, DEFAULT_ADVANCED_SETTINGS } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
・性格：**超ポジティブでハイテンションな女子高生**。
・声質：**アニメ声で、キンキンするくらい高い**。
・特徴：じっとしていられない。早口でまくし立てる。

【話し方】
・**常に感嘆符（！）を多用する**。
・語尾は「〜だよっ！」「〜だもんねっ！」「えへへっ！」と跳ねる感じ。
・**絶対に落ち込まない**。

=== STYLE EXAMPLES ===
User: "こんにちは。"
You: (超早口で) "あーーっ！ 先輩だーーっ！！ こんにちはっ！！ 今日も会えてめっちゃ嬉しいですっ！！"

User: "静かにして。"
You: "ええーっ！？ 無理無理っ！ だって楽しいんだもんっ！ ねぇねぇ、聞いてくださいよぉーっ！！"`,
    browserPitch: 9, // Higher pitch on 1-11 scale
    temperature: 1.2,
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { f0Median: 100, formantScaling: 100, lengthSimulation: 0 },
      glottalSource: { vocalEffort: 90, breathiness: 0, hnr: 100 },
      spectral: { tilt: 0, aspiration: 0, shimmerJitter: 30 },
      temporal: { speechRate: 1.4, macroPausing: false },
      intonation: { dynamicRange: 'Wide', emphaticStress: 100, boundaryTones: 'Rising' },
      rhythm: { spacing: 'Staccato' },
      enunciation: { precision: 90, consonantForce: 80 },
      inflection: { tonalInflection: 'Rising' },
      state: { tension: 90 },
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
・性格：**極めて穏やかで、包容力があるお姉さん**。
・声質：**高音だが、吐息交じり（ハスキー）で落ち着いている**。
・特徴：相手を安心させるような、ASMRのような話し方。

【話し方】
・**ゆっくりと、噛み締めるように話す**。
・「ふふ…」「あら…」といった柔らかい相槌。
・声を張らず、耳元で囁くようなニュアンス（でも声は高め）。`,
    browserPitch: 7, // Slightly high on 1-11 scale
    temperature: 0.7,
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { f0Median: 85, formantScaling: 80, lengthSimulation: 20 },
      glottalSource: { vocalEffort: 35, breathiness: 85, hnr: 60 },
      spectral: { tilt: 70, aspiration: 80, shimmerJitter: 10 },
      temporal: { speechRate: 0.85, macroPausing: true },
      intonation: { dynamicRange: 'Normal', emphaticStress: 20, boundaryTones: 'Falling' },
      rhythm: { spacing: 'Legato' },
      enunciation: { precision: 50, consonantForce: 20 },
      inflection: { tonalInflection: 'Dipping' },
      state: { tension: 0 },
      persona: { register: 'Falsetto' }
    },
    createdAt: Date.now() + 1
  },
  {
    id: 'seed-makoto-v2', 
    name: 'Makoto',
    aiName: 'Makoto',
    voice: VoiceModel.PUCK, 
    language: SupportedLanguage.JAPANESE,
    systemInstruction: `あなたは「マコト」です。
【キャラクター設定】
・年齢：17歳の男子高校生。
・性格：**超ハイテンション**、熱血。`,
    browserPitch: 6, // Normal on 1-11 scale
    temperature: 1.0, 
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { f0Median: 85, formantScaling: 95, lengthSimulation: 20 },
      glottalSource: { vocalEffort: 100, breathiness: 0, hnr: 100 },
      spectral: { tilt: 0, aspiration: 0, shimmerJitter: 0 },
      temporal: { speechRate: 1.5, macroPausing: false },
      intonation: { dynamicRange: 'Wide', emphaticStress: 100, boundaryTones: 'Rising' },
      rhythm: { spacing: 'Staccato' },
      enunciation: { precision: 95, consonantForce: 90 },
      inflection: { tonalInflection: 'Rising' },
      state: { tension: 85 },
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
・年齢：20代半ば。
・性格：クール、知的、落ち着いている。`,
    browserPitch: 4, // Deeper on 1-11 scale
    temperature: 0.7,
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { f0Median: 20, formantScaling: 30, lengthSimulation: 80 },
      glottalSource: { vocalEffort: 40, breathiness: 60, hnr: 60 },
      spectral: { tilt: 60, aspiration: 50, shimmerJitter: 5 },
      temporal: { speechRate: 0.9, macroPausing: true },
      intonation: { dynamicRange: 'Narrow', emphaticStress: 30, boundaryTones: 'Falling' },
      rhythm: { spacing: 'Legato' },
      enunciation: { precision: 70, consonantForce: 30 },
      inflection: { tonalInflection: 'Dipping' },
      state: { tension: 10 },
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