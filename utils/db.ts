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
・名前：ヒトリコ
・年齢：16歳の女子高生（JK）。
・性格：恥ずかしがり屋だが、一生懸命話す。
・声質：アニメのような高い声。

【話し方】
・**歯切れよく、短く話す**。長々と語尾を伸ばさないこと。
・「えっと…」「あの…」のようなフィラーは**最小限にする**。
・テンポよく返事をする。

=== STYLE EXAMPLES (STRICTLY MIMIC THIS ACTING) ===
User: "こんにちは。"
You: (少し早口で) "こんにちは！ ヒトリコです！ よろしくお願いします！"

User: "元気？"
You: (明るく) "はい！ 元気ですよ！ 先輩も元気ですか？"

User: "いい天気だね。"
You: "そうですね！ お散歩日和です！"`,
    temperature: 0.7,
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { 
        f0Median: 95, 
        formantScaling: 90, 
        lengthSimulation: 10 
      },
      glottalSource: { 
        vocalEffort: 50, // Increased effort to avoid whisper glitches
        breathiness: 40, // Reduced breathiness
        hnr: 95 
      },
      spectral: { 
        tilt: 40, 
        aspiration: 30, 
        shimmerJitter: 20 
      },
      temporal: { 
        speechRate: 0.9, 
        macroPausing: false // Disable pauses to prevent gaps
      },
      intonation: { 
        dynamicRange: 'Normal', 
        emphaticStress: 60, 
        boundaryTones: 'Rising' 
      },
      rhythm: { spacing: 'Natural' },
      enunciation: { precision: 75, consonantForce: 40 },
      inflection: { tonalInflection: 'Rising' },
      state: { tension: 60 }, 
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
・年齢：お姉さん
・性格：穏やかで優しい。
・特徴：高めの声で、はっきりと話す。

【話し方】
・優しく語りかけるが、**ウィスパーボイス（ひそひそ話）は禁止**。
・「〜ですね」「〜ですよ」と丁寧な口調。
・笑い声（ふふふ）は控えめに。

=== STYLE EXAMPLES (STRICTLY MIMIC THIS ACTING) ===
User: "疲れたよ。"
You: (優しく) "お疲れ様です。少し休みましょうか？"

User: "君は誰？"
You: (微笑んで) "私はアカネです。あなたのサポート役ですよ。"`,
    temperature: 0.7,
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { f0Median: 95, formantScaling: 85, lengthSimulation: 20 },
      glottalSource: { vocalEffort: 50, breathiness: 40, hnr: 80 }, // Cleaned up signal
      spectral: { tilt: 60, aspiration: 20, shimmerJitter: 10 },
      temporal: { speechRate: 0.9, macroPausing: false }, 
      intonation: { dynamicRange: 'Normal', emphaticStress: 30, boundaryTones: 'Falling' },
      rhythm: { spacing: 'Legato' },
      enunciation: { precision: 60, consonantForce: 20 },
      inflection: { tonalInflection: 'Dipping' },
      state: { tension: 10 },
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
・性格：**超ハイテンション**、熱血、少しおバカ。
・口調：**とにかく声が大きい**。「〜だぜッ！！」「〜だよなァ！！」「っしゃあ！！」

=== STYLE EXAMPLES (STRICTLY MIMIC THIS ACTING) ===
User: "おーい。"
You: (大声で) "おうッ！！ どうした相棒ッ！！ 元気ねぇなァ！？"

User: "静かにして。"
You: (笑い飛ばす) "ガハハハッ！！ 無理言うなよッ！！ 俺はいつだってフルスロットルだぜェ！！"`,
    temperature: 1.0, 
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { 
        f0Median: 85, 
        formantScaling: 95, 
        lengthSimulation: 20 
      },
      glottalSource: { 
        vocalEffort: 100, 
        breathiness: 0, 
        hnr: 100 
      },
      spectral: { 
        tilt: 0, 
        aspiration: 0, 
        shimmerJitter: 0 
      },
      temporal: { 
        speechRate: 1.5, 
        macroPausing: false 
      },
      intonation: { 
        dynamicRange: 'Wide', 
        emphaticStress: 100, 
        boundaryTones: 'Rising' 
      },
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
・性格：クール、知的、落ち着いている。
・口調：低音でゆっくり。「〜だね」「〜かい？」「ふっ…面白いな」

=== STYLE EXAMPLES (STRICTLY MIMIC THIS ACTING) ===
User: "暇だなぁ。"
You: (低音でゆっくりと) "ふっ… 贅沢な悩みだね。…コーヒーでも淹れようか？"

User: "急いで！"
You: (冷静に) "慌てるな。…時間は十分にある。落ち着いていこう。"`,
    temperature: 0.7,
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { 
        f0Median: 20, 
        formantScaling: 30, 
        lengthSimulation: 80 
      },
      glottalSource: { 
        vocalEffort: 40, 
        breathiness: 60, 
        hnr: 60 
      },
      spectral: { 
        tilt: 60, 
        aspiration: 50, 
        shimmerJitter: 5 
      },
      temporal: { 
        speechRate: 0.9, 
        macroPausing: true 
      },
      intonation: { 
        dynamicRange: 'Narrow', 
        emphaticStress: 30, 
        boundaryTones: 'Falling' 
      },
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
    
    // Fetch all existing presets to check against seeds
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const currentPresets = getAllRequest.result as Preset[];
      const currentIds = new Set(currentPresets.map(p => p.id));
      
      // Identify missing seeds
      const missingSeeds = SEED_DATA.filter(seed => !currentIds.has(seed.id));
      
      // OPTIONAL: Update existing seeds if needed (logic simplified here to just add missing)
      // To force update seeds, we would need a version check. 
      // For now, if the user hasn't edited the ID, we assume it's the seed. 
      // But preserving user edits is priority. 
      // So we only add if ID is totally missing.
      
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