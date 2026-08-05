import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// VOICE DNA DATABASE (20 African Countries)
// Complete vocal intelligence for authentic accent synthesis
// ─────────────────────────────────────────────────────────────
interface VoiceDNA {
  countryId: string;
  region: string;
  capital: string;
  localLanguages: string[];
  speechMelody: string;
  consonantStyle: string;
  rhythmPattern: string;
  culturalContext: string;
  antiPatterns: string[];
}

const VOICE_DNA: Record<string, VoiceDNA> = {
  NG: {
    countryId: 'NG', region: 'West Africa', capital: 'Lagos',
    localLanguages: ['Hausa', 'Yoruba', 'Igbo', 'Pidgin English'],
    speechMelody: 'Highly melodic and dynamic Nigerian intonation. Pitch rises vibrantly on key nouns and action verbs, carrying a commanding yet warm cadence.',
    consonantStyle: 'Crisp, firm, and percussive consonants. Hard "t" and "d" sounds with deep pectoral resonance; clear bilabial articulation without weak reduction.',
    rhythmPattern: 'Syllable-timed, punchy staccato rhythm with rapid, confident delivery and natural emphasis on action phrases.',
    culturalContext: 'Extremely confident, charismatic, direct, and persuasive. Inspired by Lagos urban energy and rich oral traditions.',
    antiPatterns: ['British RP English', 'Standard American English', 'Australian English', 'South African English', 'Monotone robotic TTS'],
  },
  CI: {
    countryId: 'CI', region: 'West Africa', capital: 'Abidjan',
    localLanguages: ['Baoulé', 'Dioula', 'Bété', 'Nouchi'],
    speechMelody: 'Warm, musical, and expressive Ivorian lilt. Phrases naturally end with a gentle rising intonation (accent Nouchi) that invites warmth and connection.',
    consonantStyle: 'Softened tapped "r" sounds, rich open nasal vowels (an, on, in), clear bilabials, and smooth consonant transitions.',
    rhythmPattern: 'Bouncy, syncopated, and rhythmic. Key vowels are slightly elongated for emphasis, reflecting Abidjan Nouchi speech cadence.',
    culturalContext: 'Joyful, hospitable, convivial, and deeply expressive. Captures the vibrant, welcoming spirit of Abidjan.',
    antiPatterns: ['Parisian French', 'Canadian French', 'Belgian French', 'Standard European French', 'Monotone delivery'],
  },
  CM: {
    countryId: 'CM', region: 'Central Africa', capital: 'Douala/Yaoundé',
    localLanguages: ['Ewondo', 'Duala', 'Fulfulde', 'Camfranglais'],
    speechMelody: 'Deep, authoritative, and grounded pitch. Heavy chest resonance with deliberate downward intonations at sentence endings.',
    consonantStyle: 'Strong, percussive consonants. Distinct, un-softened plosives (p, b, t, d, k, g) articulated with clear firmness.',
    rhythmPattern: 'Measured, steady, and deliberate pacing with powerful, even stress across words conveying gravitas.',
    culturalContext: 'Assertive, serious, respectful, and dignified. Represents Cameroonian pride, authority, and calm strength.',
    antiPatterns: ['Parisian French', 'European French', 'Senegalese French', 'High-pitched rushed speech'],
  },
  SN: {
    countryId: 'SN', region: 'West Africa', capital: 'Dakar',
    localLanguages: ['Wolof', 'Pulaar', 'Jola'],
    speechMelody: 'Smooth, poetic, and fluid intonation. Features gentle cascading pitch transitions with polite, dignified vocal contours.',
    consonantStyle: 'Soft, clean consonants with distinct Wolof-influenced open vowels and lightly tapped palatal sounds.',
    rhythmPattern: 'Continuous, elegant, and lyrical flow. Sentences glide effortlessly with harmonious breathing pauses.',
    culturalContext: 'Infused with "Teranga" (world-famous Senegalese hospitality). Respectful, serene, noble, and deeply welcoming.',
    antiPatterns: ['Parisian French', 'Canadian French', 'Harsh staccato', 'Aggressive delivery'],
  },
  CD: {
    countryId: 'CD', region: 'Central Africa', capital: 'Kinshasa',
    localLanguages: ['Lingala', 'Swahili', 'Tshiluba', 'Kikongo'],
    speechMelody: 'Vibrant, melodious, and highly expressive. Pitch moves in graceful tonal arches shaped by Lingala musicality.',
    consonantStyle: 'Soft, rounded consonants with open, bright, sustained vowels and smooth vocalic resonance.',
    rhythmPattern: 'Lively, dance-like, syncopated cadence with rhythmic pauses and expressive vocal warmth.',
    culturalContext: 'Flamboyant, artistic, warm, and captivating. Reflects Kinshasa's legendary music and cultural energy.',
    antiPatterns: ['Parisian French', 'Belgian French', 'Flat monotone delivery', 'Dull robotic speech'],
  },
  GH: {
    countryId: 'GH', region: 'West Africa', capital: 'Accra',
    localLanguages: ['Twi', 'Ga', 'Ewe', 'Fante'],
    speechMelody: 'Polite, melodic, and dignified pitch contour with gentle rising inflections drawn from Twi tonal patterns.',
    consonantStyle: 'Crisp, clean, articulate consonants with full, rounded vowels and precise enunciation.',
    rhythmPattern: 'Measured, steady, and clear. Balanced syllable-timing designed for maximum clarity and respect.',
    culturalContext: 'Warm, courteous, educated, and hospitable. Reflects Ghanaian royal dignity and respectful storytelling.',
    antiPatterns: ['Standard American English', 'British RP English', 'Harsh aggressive delivery'],
  },
  MA: {
    countryId: 'MA', region: 'North Africa', capital: 'Casablanca',
    localLanguages: ['Darija', 'Tamazight'],
    speechMelody: 'Fast, intricate, undulating melody blending Moroccan Arabic vocal contours with precise French phrasing.',
    consonantStyle: 'Rich guttural and pharyngeal resonance (kh, q, h) combined with crisp, forward bilabial articulation.',
    rhythmPattern: 'Dynamic contrast between swift staccato word bursts and smooth, elegant sentence transitions.',
    culturalContext: 'Sophisticated, warm, sharp, and cosmopolitan. Reflects North African Maghrebi heritage and Mediterranean flair.',
    antiPatterns: ['Parisian French', 'Levantine Arabic', 'Gulf Arabic', 'Flat European delivery'],
  },
  ZA: {
    countryId: 'ZA', region: 'Southern Africa', capital: 'Johannesburg',
    localLanguages: ['Zulu', 'Xhosa', 'Afrikaans', 'Sotho'],
    speechMelody: 'Broad, resonant, open vocal melody. Rich back-of-throat resonance with dynamic pitch variations.',
    consonantStyle: 'Crisp, sharp articulation of "t" and "k", subtle glottal stops, and firm consonant releases.',
    rhythmPattern: 'Punchy, energetic, and rhythmic with smooth transitions between deliberate emphasis and rapid bursts.',
    culturalContext: 'Bold, modern, confident, and direct. Grounded in Ubuntu spirit and Johannesburg urban vibrancy.',
    antiPatterns: ['British RP English', 'Australian English', 'Standard American English', 'Robotic TTS'],
  },
  KE: {
    countryId: 'KE', region: 'East Africa', capital: 'Nairobi',
    localLanguages: ['Swahili', 'Kikuyu', 'Luo', 'Sheng'],
    speechMelody: 'Bright, rhythmic, and upbeat intonation. Emphasis on penultimate syllables following Swahili speech rules.',
    consonantStyle: 'Clear, strong consonants with rolled or tapped "r" and pure, un-diphthongized open vowels.',
    rhythmPattern: 'Steady, punchy, syllable-timed staccato rhythm with crisp, energetic transitions.',
    culturalContext: 'Entrepreneurial, articulate, polite, and forward-looking. Nairobi tech-hub energy with East African clarity.',
    antiPatterns: ['Standard American English', 'British RP English', 'West African Pidgin'],
  },
  GA: {
    countryId: 'GA', region: 'Central Africa', capital: 'Libreville',
    localLanguages: ['Fang', 'Myene', 'Nzebi'],
    speechMelody: 'Smooth, relaxed, refined, and sophisticated. Controlled pitch contour with subtle equatorial elegance.',
    consonantStyle: 'Soft, rounded Bantu-influenced consonant articulation with polished, open French vowels.',
    rhythmPattern: 'Fluid, unhurried, and continuous pacing where sentences flow effortlessly without abrupt stops.',
    culturalContext: 'Calm, cultivated, diplomatic, and noble. Reflects equatorial forest heritage and Libreville refinement.',
    antiPatterns: ['Parisian French', 'Canadian French', 'Belgian French', 'Harsh European French'],
  },
  BJ: {
    countryId: 'BJ', region: 'West Africa', capital: 'Cotonou',
    localLanguages: ['Fon', 'Yoruba', 'Bariba'],
    speechMelody: 'Warm, resonant, narrative intonation shaped by Fon tonal pitch movements and expressive inflection.',
    consonantStyle: 'Deep, chesty consonant resonance with expansive, clear vowels and nasal harmony.',
    rhythmPattern: 'Deliberate, storytelling-oriented rhythm with meaningful artistic pauses.',
    culturalContext: 'Deeply traditional, respectful, spirited, and historical. Rooted in ancient Dahomey oral art.',
    antiPatterns: ['Parisian French', 'European French', 'Monotone delivery'],
  },
  BF: {
    countryId: 'BF', region: 'West Africa', capital: 'Ouagadougou',
    localLanguages: ['Mooré', 'Dioula', 'Fulfulde'],
    speechMelody: 'Grounded, sincere, steady pitch contour conveying deep honesty, integrity, and direct connection.',
    consonantStyle: 'Strong, clear, unpretentious consonants derived from Mooré phonetic strength.',
    rhythmPattern: 'Even, march-like steady rhythm paced deliberately for absolute understanding.',
    culturalContext: 'Proud, earnest, and deeply sincere — representing the "Land of Upright People".',
    antiPatterns: ['Parisian French', 'Overly dramatic speech', 'Rushed urban French'],
  },
  ML: {
    countryId: 'ML', region: 'West Africa', capital: 'Bamako',
    localLanguages: ['Bambara', 'Songhai', 'Tamasheq'],
    speechMelody: 'Poetic, flowing, deeply musical Griot melody. Intonation ebbs and flows like ancestral storytelling.',
    consonantStyle: 'Softened, melodious consonants with rich Bambara vowel lilt and warm resonance.',
    rhythmPattern: 'Fluid, cascading cadence structured like musical storytelling phrases.',
    culturalContext: 'Reverent, historic, artistic, and peaceful. The voice is a noble instrument of wisdom and history.',
    antiPatterns: ['Parisian French', 'Harsh aggressive tones', 'Rapid staccato'],
  },
  TG: {
    countryId: 'TG', region: 'West Africa', capital: 'Lomé',
    localLanguages: ['Ewe', 'Kabiye'],
    speechMelody: 'Friendly, bright, inviting pitch modulation that shows high empathy and warmth.',
    consonantStyle: 'Clear, crisp consonants with distinct Ewe vowel coloring and gentle articulation.',
    rhythmPattern: 'Upbeat, bouncy, lively rhythm reflecting coastal warmth.',
    culturalContext: 'Welcoming, relaxed, communal, and genuine. Coastal Lomé warmth and community connection.',
    antiPatterns: ['Parisian French', 'Cold distant European tone'],
  },
  CG: {
    countryId: 'CG', region: 'Central Africa', capital: 'Brazzaville',
    localLanguages: ['Kikongo', 'Lingala'],
    speechMelody: 'Sophisticated, stylized, and velvety smooth. Lingala musicality fused with elegant phrasing.',
    consonantStyle: 'Soft, rounded, impeccably stylized French pronunciation with Central African warmth.',
    rhythmPattern: 'Graceful, continuous cadence without harsh stops, moving with quiet pride.',
    culturalContext: 'Inspired by La Sape culture — impeccably polished, elegant, proud, and distinguished.',
    antiPatterns: ['Parisian French', 'Standard European French', 'Unrefined delivery'],
  },
  TN: {
    countryId: 'TN', region: 'North Africa', capital: 'Tunis',
    localLanguages: ['Tunisian Derja'],
    speechMelody: 'Bright, agile, Mediterranean melody. Quick pitch inflections blending Derja and French cadences.',
    consonantStyle: 'Crisp, forward consonants with smoothed guttural sounds and clear open vowels.',
    rhythmPattern: 'Rapid, energetic, staccato rhythm filled with expressive Mediterranean vitality.',
    culturalContext: 'Cosmopolitan, warm, scholarly, and vibrant Mediterranean North African voice.',
    antiPatterns: ['Parisian French', 'Gulf Arabic', 'Levantine Arabic'],
  },
  DZ: {
    countryId: 'DZ', region: 'North Africa', capital: 'Alger',
    localLanguages: ['Darja', 'Tamazight'],
    speechMelody: 'Bold, assertive, passionate intonation with strong emphasis and decisive pitch drops at sentence ends.',
    consonantStyle: 'Heavy, guttural Arabic consonant depth (kh, q) infusing French words with authentic Maghrebi power.',
    rhythmPattern: 'Punctuated, rhythmic bursts of passionate delivery followed by intentional dramatic pauses.',
    culturalContext: 'Fiery, proud, independent, and commanding. A voice of dignity and strength.',
    antiPatterns: ['Parisian French', 'Timid weak delivery', 'Middle Eastern Arabic'],
  },
  EG: {
    countryId: 'EG', region: 'North Africa', capital: 'Le Caire',
    localLanguages: ['Egyptian Arabic'],
    speechMelody: 'Theatrical, warm, iconic Cairo melody. Richly expressive pitch drawl recognized across the region.',
    consonantStyle: 'Hard "g" for "j", elongated vowels, broad, relaxed, cinematic articulation.',
    rhythmPattern: 'Flowing, rhythmic, engaging, and cinematic with natural dramatic pauses.',
    culturalContext: 'Charming, dramatic, master-storyteller energy rooted in Egyptian film and broadcast legacy.',
    antiPatterns: ['Standard American English', 'Levantine Arabic', 'Gulf Arabic'],
  },
  UG: {
    countryId: 'UG', region: 'East Africa', capital: 'Kampala',
    localLanguages: ['Luganda', 'Swahili', 'Runyankore'],
    speechMelody: 'Gentle, sing-song Luganda melody. Soft pitch modulation carrying profound warmth.',
    consonantStyle: 'Soft consonants avoiding harsh plosives, paired with extended, melodic vowels.',
    rhythmPattern: 'Smooth, unhurried, continuous flow with gentle transitions between phrases.',
    culturalContext: 'Pearl of Africa identity — famed for extreme politeness, warmth, and respectful grace.',
    antiPatterns: ['Standard American English', 'British RP English', 'Aggressive delivery'],
  },
  TZ: {
    countryId: 'TZ', region: 'East Africa', capital: 'Dar es Salaam',
    localLanguages: ['Swahili'],
    speechMelody: 'Deeply resonant, pure Swahili rolling melody. Peaceful, grounded, and harmonious pitch contour.',
    consonantStyle: 'Clean, soft Bantu articulation with unblemished, pure open vowels.',
    rhythmPattern: 'Relaxed, steady, rhythmic coastal cadence (Bongo Flava peace and tranquility).',
    culturalContext: 'Peaceful, unified, harmonious Swahili identity — warm, inclusive, and grounded.',
    antiPatterns: ['Standard American English', 'British RP English', 'Rushed stressful cadence'],
  }
};

const LOCAL_EXPRESSIONS: Record<string, string> = {
  NG: 'Natural fillers & interjections: "you know", "I tell you", "my brother", "ehn", "Na so!", "I swear!".',
  CI: 'Natural fillers & interjections: "dêh", "wôrô-wôrô", "kpakpatoya", "on dit quoi", "C'est chaud!", "Walahi!".',
  CM: 'Natural fillers & interjections: "c'est ça même", "je dis seulement", "tu vois non", "Wèè!", "Aïe!".',
  SN: 'Natural fillers & interjections: "ndéysan", "nanga déf?", "Yalla!", "Inchallah!", "Machallah!".',
  CD: 'Natural fillers & interjections: "pona nini", "yo", "Mbote!", "Tozali!", "Eh eh!".',
  GH: 'Natural fillers & interjections: "chale", "you see", "Ete sen?", "Charley!", "Ei!".',
  MA: 'Natural fillers & interjections: "walakin", "yak", "safi", "Labas?", "Wallah!", "Ya Salaam!".',
  ZA: 'Natural fillers & interjections: "shame", "just now", "Howzit?", "Eish!", "Haibo!", "Yoh!".',
  KE: 'Natural fillers & interjections: "si you know", "ati", "lakini", "Sasa!", "Mambo vipi?", "Aki!".',
  GA: 'Natural fillers & interjections: "disons", "non mais", "Mbolo!", "Ah bon?", "C'est sérieux!".',
  BJ: 'Natural fillers & interjections: "kpèkpè", "à côté de ça", "A fon gbé?", "Azô!".',
  BF: 'Natural fillers & interjections: "bon", "ça va aller", "en tout cas", "Laafi?", "C'est sûr!".',
  ML: 'Natural fillers & interjections: "bon", "voilà", "I ni ce!", "Wallahi!", "Barika!".',
  TG: 'Natural fillers & interjections: "éfè", "n'est-ce pas", "Efoa?", "Yoo!".',
  CG: 'Natural fillers & interjections: "eh bien", "c'est ça", "Mbote!", "C'est fort!".',
  TN: 'Natural fillers & interjections: "barcha", "ya3ni", "Labès?", "Wallahi!", "Ya hasra!".',
  DZ: 'Natural fillers & interjections: "bezaf", "saha", "Wach rak?", "Wallah!", "Ya Rebbi!".',
  EG: 'Natural fillers & interjections: "ya3ni", "tab3an", "ma3lesh", "Ahlan!", "Wallahi!", "Yalla!".',
  UG: 'Natural fillers & interjections: "banange", "actually", "Oli otya?", "Bambi!", "Webale!".',
  TZ: 'Natural fillers & interjections: "sawa sawa", "kweli", "basi", "Habari!", "Mambo!", "Asante!".',
};

const VOICE_MAP: Record<string, string> = {
  'female-voice1': 'Aoede',
  'female-voice2': 'Kore',
  'female-voice3': 'Leda',
  'male-voice1': 'Puck',
  'male-voice2': 'Charon',
  'male-voice3': 'Fenrir',
};

const CONTENT_SCENES: Record<string, string> = {
  advertisement: 'You are recording a premium TV/radio advertisement. Punchy, persuasive, magnetic delivery. Every word makes the listener want to buy. Vary your pace for dramatic impact.',
  tiktok: 'You are filming a viral short video. Ultra-energetic, authentic, speaking directly to your best friend. Rapid-fire, natural reactions, high energy.',
  podcast: 'You are hosting a popular podcast. Conversational, intimate, thoughtful. Speak as if one person is sitting across from you in a cozy studio.',
  news: 'You are a trusted primetime news anchor. Serious, authoritative, measured. Zero smiling — absolute gravitas and deliberate pacing.',
  storytelling: 'You are a master storyteller by firelight. Build tension slowly, use dramatic pauses, whisper during suspense, let your voice paint vivid scenes.',
  documentary: 'You are narrating a cinematic documentary. Calm, contemplative, wise. Slow enough that every sentence creates a mental picture.',
  motivation: 'You are on stage at a massive conference. Your voice builds like a wave — starting calm then rising with passionate conviction.',
  youtube: 'You are a popular YouTuber. Energetic but genuine, natural enthusiasm, smile audibly, throw in natural reactions.',
  radio: 'You are a beloved radio host on a major FM station. Smooth, flowing, warm delivery. The listener feels like a close friend.',
  training: 'You are leading an online training course. Patient, clear, pedagogical. Sound encouraging and approachable.',
  commercial: 'You are presenting a business solution. Confident, credible, polished. Inspire trust.',
  narration: 'You are recording a professional voiceover. Versatile, clear, expressive. Balanced pacing with rich emotional nuances.',
};

function buildDirectorPrompt(params: {
  script: string;
  countryId?: string;
  countryName: string;
  gender: string;
  age: number;
  voiceVariant?: string;
  accentLevel?: 'light' | 'medium' | 'strong';
  useLocalExpressions?: boolean;
  emotion?: string;
  contentStyle?: string;
  personality?: string;
  vocalObjective?: string;
  speed?: number;
  pitch?: number;
}): { directorBrief: string; actualVoiceId: string } {
  const {
    countryId: reqCountryId, countryName, gender, age, voiceVariant,
    accentLevel = 'strong', useLocalExpressions, emotion, contentStyle,
    personality, vocalObjective, speed = 1.0, pitch = 1.0
  } = params;

  let countryId = (reqCountryId || '').toUpperCase();
  if (!countryId || !VOICE_DNA[countryId]) {
    const match = Object.keys(VOICE_DNA).find(id => {
      const dna = VOICE_DNA[id];
      return countryName.toLowerCase().includes(id.toLowerCase()) ||
             countryName.toLowerCase().includes(dna.capital.toLowerCase()) ||
             dna.region.toLowerCase().includes(countryName.toLowerCase());
    });
    countryId = match || 'CI';
  }

  const dna = VOICE_DNA[countryId] || VOICE_DNA['CI'];

  const voiceKey = `${gender.toLowerCase()}-${voiceVariant || 'voice1'}`;
  const actualVoiceId = VOICE_MAP[voiceKey] || (gender.toLowerCase() === 'female' ? 'Aoede' : 'Puck');
  const genderWord = gender.toLowerCase() === 'female' ? 'woman' : 'man';

  const intensityMap = {
    light: `You have a professional speaking voice with subtle, understated traces of your ${dna.capital} accent.`,
    medium: `You have a clear, unmistakable, authentic native accent from ${countryName} (${dna.capital}).`,
    strong: `You have a rich, thick, heavy, unapologetic native accent from ${countryName} (${dna.capital}). Every word is deeply infused with local speech patterns and the rhythm of ${dna.localLanguages[0]}.`,
  };
  const accentIntensity = intensityMap[accentLevel] || intensityMap.strong;

  const scene = CONTENT_SCENES[contentStyle || 'narration'] || CONTENT_SCENES.narration;

  const emotionMap: Record<string, string> = {
    happy: 'Your mood is genuinely happy — smile while speaking, let warmth and brightness color every phrase.',
    serious: 'Your mood is serious and focused — no smiling, deliberate pacing, gravitas in every word.',
    energetic: 'Your mood is electric — speak with urgency and excitement. Fast-paced but articulate.',
    soft: 'Your mood is gentle and soothing — speak softly, like comforting someone you care about.',
  };
  const emotionDesc = emotion && emotion !== 'neutral' ? (emotionMap[emotion.toLowerCase()] || '') : '';

  const personalityMap: Record<string, string> = {
    entrepreneur: 'You have the energy of a startup founder pitching investors — assertive, visionary.',
    professor: 'You have the calm authority of a university professor — articulate, patient.',
    journalist: 'You have the precision of an award-winning journalist — objective, crisp, commanding.',
    ceo: 'You have the commanding presence of a Fortune 500 CEO — visionary, authoritative.',
    coach: 'You have the empowering fire of a life coach — passionate, building people up.',
    radio_host: 'You have the smooth charm of a beloved radio host — perfect pacing, natural transitions.',
    influencer: 'You have the magnetic charisma of a social media star — trendy, relatable.',
  };
  const personalityDesc = personality ? (personalityMap[personality] || '') : '';

  const lines = [
    `[CHARACTER & ORIGIN]`,
    `You are a ${age}-year-old ${genderWord} born and raised in ${countryName} (${dna.capital}).`,
    `Your native speech is rooted in ${dna.localLanguages.join(', ')}.`,
    `${dna.culturalContext}.`,
    personalityDesc,
    ``,
    `[ACCENT & PHONETICS - CRITICAL]`,
    accentIntensity,
    `Speech Melody: ${dna.speechMelody}`,
    `Consonant & Vowel Style: ${dna.consonantStyle}`,
    `Rhythm & Cadence: ${dna.rhythmPattern}`,
    `STRICT ANTI-PATTERNS: You must NEVER sound like: ${dna.antiPatterns.join(', ')}. Do NOT sound like a standard European, Parisian, or American speaker.`,
    ``,
    `[SCENE & ATMOSPHERE]`,
    scene,
    ``,
    emotionDesc,
    speed < 0.95 ? 'Speak at a deliberately slower, measured pace.' : (speed > 1.05 ? 'Speak at a brisk, energetic pace.' : ''),
    pitch < 0.95 ? 'Lower vocal register — deep chest tone.' : (pitch > 1.05 ? 'Higher vocal register — bright pitch.' : ''),
    ``,
    useLocalExpressions && LOCAL_EXPRESSIONS[countryId] ? `[LOCAL CULTURAL TEXTURE]
${LOCAL_EXPRESSIONS[countryId]}
` : '',
    `[RULES]`,
    `1. Perform the text with the exact accent, melody, and rhythm described above.`,
    `2. Speak ONLY the transcript text provided. Do not read any bracketed directions or labels.`,
    `3. Be 100% authentically ${countryName} — zero robotic or European TTS sound.`,
  ].filter(line => line !== undefined && line !== '');

  return { directorBrief: lines.join('
'), actualVoiceId };
}

const aiClientCache = new Map<string, GoogleGenAI>();

function getAiClient(apiKey: string): GoogleGenAI {
  if (!aiClientCache.has(apiKey)) {
    aiClientCache.set(apiKey, new GoogleGenAI({ apiKey }));
  }
  return aiClientCache.get(apiKey)!;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const body = req.body || {};
    const { script, voiceId, customApiKey, options } = body;

    if (!script || typeof script !== 'string' || !script.trim()) {
      return res.status(400).json({ error: "Le paramètre 'script' est requis et ne peut pas être vide." });
    }

    const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY')
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'Clé API Gemini manquante. Dans Vercel: Settings -> Environment Variables -> Ajoutez GEMINI_API_KEY.',
        diagnostic: {
          GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'present' : 'MISSING',
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'present' : 'MISSING',
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'MISSING',
        }
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const { data, error } = await supabase.auth.getUser(token);
          if (error || !data.user) {
            console.warn('[AfriVoice] Auth token invalid/expired — continuing (quota managed client-side):', error?.message);
          } else {
            console.log('[AfriVoice] Auth OK — user:', data.user.email);
          }
        }
      } catch (authError: any) {
        console.warn('[AfriVoice] Supabase auth check failed (non-blocking):', authError?.message);
      }
    }

    const { directorBrief, actualVoiceId } = buildDirectorPrompt({
      script,
      countryId: options?.countryId,
      countryName: options?.countryName || 'Côte d'Ivoire',
      gender: options?.gender || 'female',
      age: options?.age || 30,
      voiceVariant: options?.voiceVariant || voiceId,
      accentLevel: options?.accentLevel || 'strong',
      useLocalExpressions: options?.useLocalExpressions,
      emotion: options?.emotion,
      contentStyle: options?.contentStyle,
      personality: options?.personality,
      vocalObjective: options?.vocalObjective,
      speed: options?.speed,
      pitch: options?.pitch,
    });

    const fullPrompt = `${directorBrief}

[TRANSCRIPT - READ ONLY THIS TEXT]
<transcript>
${script.trim()}
</transcript>`;

    const ai = getAiClient(apiKey);

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: actualVoiceId },
          },
        },
      },
    });

    const part = geminiResponse.candidates?.[0]?.content?.parts?.[0];
    const audioData = (part as any)?.inlineData?.data;
    const mimeType = (part as any)?.inlineData?.mimeType || 'audio/L16;rate=24000';

    if (!audioData) {
      return res.status(500).json({
        error: 'Aucune donnée audio reçue de Gemini. Vérifiez que votre clé API est valide.',
        voiceUsed: actualVoiceId,
      });
    }

    return res.status(200).json({ base64Audio: audioData, mimeType });

  } catch (error: any) {
    console.error('[AfriVoice] Error:', error?.message || error);
    const statusCode = typeof error?.status === 'number' ? Math.min(error.status, 599) : 500;
    return res.status(statusCode).json({
      error: error?.message || 'Erreur inconnue lors de la génération audio.',
      errorType: error?.constructor?.name || 'UnknownError',
    });
  }
}
