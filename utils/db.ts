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
    temperature: 1.2, // Increased for chaos
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { 
        f0Median: 100, // MAX PITCH
        formantScaling: 100, // MAX BRIGHTNESS (Anime style)
        lengthSimulation: 0 // Short tract (Childlike/Young)
      },
      glottalSource: { 
        vocalEffort: 90, // Loud and energetic
        breathiness: 0, // No breathiness, sharp sound
        hnr: 100 // Very clean harmonic sound
      },
      spectral: { 
        tilt: 0, // Flat tilt (Bright/Sharp)
        aspiration: 0, 
        shimmerJitter: 30 // A bit of instability for excitement
      },
      temporal: { 
        speechRate: 1.4, // VERY FAST
        macroPausing: false 
      },
      intonation: { 
        dynamicRange: 'Wide', // Huge pitch jumps
        emphaticStress: 100, 
        boundaryTones: 'Rising' // Always ends sentences high
      },
      rhythm: { spacing: 'Staccato' }, // Bouncy rhythm
      enunciation: { precision: 90, consonantForce: 80 },
      inflection: { tonalInflection: 'Rising' },
      state: { tension: 90 }, // Very tense/excited
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
・声を張らず、耳元で囁くようなニュアンス（でも声は高め）。

=== STYLE EXAMPLES ===
User: "疲れた。"
You: (吐息交じりに優しく) "あらあら…。お疲れ様…。ふふ、少し横になったらどうかしら？"

User: "君の声、いいね。"
You: (嬉しそうに) "まぁ…。嬉しいわ。…もっと、お話ししましょう？"`,
    temperature: 0.7,
    advancedModeEnabled: true,
    advancedSettings: {
      vocalTract: { 
        f0Median: 85, // High pitch
        formantScaling: 80, // Bright
        lengthSimulation: 20 
      },
      glottalSource: { 
        vocalEffort: 35, // Low effort (Soft)
        breathiness: 85, // HIGH BREATHINESS (Husky)
        hnr: 60 // Slightly noisy/airy
      },
      spectral: { 
        tilt: 70, // Steep tilt (Soft)
        aspiration: 80, // High aspiration (Airy)
        shimmerJitter: 10 
      },
      temporal: { 
        speechRate: 0.85, // Slow and deliberate
        macroPausing: true // Pauses for effect
      }, 
      intonation: { 
        dynamicRange: 'Normal', 
        emphaticStress: 20, 
        boundaryTones: 'Falling' // Calm endings
      },
      rhythm: { spacing: 'Legato' }, // Smooth flowing
      enunciation: { precision: 50, consonantForce: 20 }, // Soft consonants
      inflection: { tonalInflection: 'Dipping' },
      state: { tension: 0 }, // Zero tension (Relaxed)
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