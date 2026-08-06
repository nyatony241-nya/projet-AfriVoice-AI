import express from 'express';
import cors from 'cors';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { humanizeScript } from './services/phonetic-humanizer/index.js';

dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const app = express();
const PORT = process.env.PORT || 3005;

// CORS restreint aux origines légitimes (pas de wildcard *)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL, // URL de production (ex: https://afrivoice.ai)
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, curl, SSR)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origine non autorisée par CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    keyConfigured: !!(process.env.GEMINI_API_KEY),
    engine: 'VoicePromptEngine v3 — AI Voice Director'
  });
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const verifyAuthToken = async (req, res, next) => {
  if (!supabase) {
    return res.status(503).json({ error: "Service d'authentification indisponible. Configurez les variables Supabase." });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Token d'authentification manquant." });
  }
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Token d'authentification invalide ou expiré." });
  }
  req.user = data.user;
  next();
};

// ══════════════════════════════════════════════════════════════
// AI VOICE DIRECTOR v3 — Narrative-Driven Prompt Engine (JS)
// ══════════════════════════════════════════════════════════════

// Voice DNA — concise profiles for 20 African countries
const VOICE_DNA = {
  'NG': { capital: 'Abuja/Lagos', region: 'West Africa', lang: 'Hausa, Yoruba, Igbo', style: 'Dynamic, melodic, confident. Nigerian English with Pidgin cadence.', anti: 'British RP, Standard American, Australian English' },
  'CI': { capital: 'Abidjan', region: 'West Africa', lang: 'Baoulé, Dioula, Nouchi', style: 'Musical, warm, bouncy Nouchi rhythm. Rising intonations.', anti: 'Parisian French, Canadian French' },
  'CM': { capital: 'Yaoundé/Douala', region: 'Central Africa', lang: 'Ewondo, Duala, Camfranglais', style: 'Deep, authoritative, percussive consonants. Deliberate pacing.', anti: 'Parisian French, European French' },
  'SN': { capital: 'Dakar', region: 'West Africa', lang: 'Wolof, Pulaar', style: 'Smooth, poetic, flowing. Teranga hospitality in every word.', anti: 'Parisian French, Canadian French' },
  'CD': { capital: 'Kinshasa', region: 'Central Africa', lang: 'Lingala, Kikongo', style: 'Warm, dance-like, Lingala musicality. Vibrant expression.', anti: 'Parisian French, Belgian French' },
  'GH': { capital: 'Accra', region: 'West Africa', lang: 'Twi, Ga, Ewe', style: 'Clear, educated, dignified. Akan tonal quality.', anti: 'British RP, Standard American' },
  'MA': { capital: 'Casablanca/Rabat', region: 'North Africa', lang: 'Darija, Tamazight', style: 'Melodic Arabic-French fusion. Cosmopolitan Maghrebi warmth.', anti: 'Parisian French, Egyptian Arabic' },
  'ZA': { capital: 'Johannesburg', region: 'Southern Africa', lang: 'Zulu, Xhosa, Afrikaans', style: 'Bold, multicultural, Ubuntu warmth. Click consonant influence.', anti: 'British RP, Australian English' },
  'KE': { capital: 'Nairobi', region: 'East Africa', lang: 'Swahili, Kikuyu, Sheng', style: 'Crisp, tech-hub energy. Swahili melodic Bantu quality.', anti: 'British English, Standard American' },
  'GA': { capital: 'Libreville', region: 'Central Africa', lang: 'Fang, Myene', style: 'Smooth, refined, diplomatic. Equatorial elegance.', anti: 'Parisian French, Belgian French' },
  'BJ': { capital: 'Cotonou', region: 'West Africa', lang: 'Fon, Yoruba', style: 'Warm, storytelling-rich. Fon tonal influence.', anti: 'Parisian French, European French' },
  'BF': { capital: 'Ouagadougou', region: 'West Africa', lang: 'Mooré, Dioula', style: 'Grounded, sincere, steady. Land of upright people.', anti: 'Parisian French, Rushed urban French' },
  'ML': { capital: 'Bamako', region: 'West Africa', lang: 'Bambara, Songhai', style: 'Griot-inspired, poetic, deeply musical. Ancestral storytelling.', anti: 'Parisian French, European French' },
  'TG': { capital: 'Lomé', region: 'West Africa', lang: 'Ewe, Kabiyé', style: 'Gentle, warm, inviting. Coastal Lomé brightness.', anti: 'Parisian French, Cold European tone' },
  'CG': { capital: 'Brazzaville', region: 'Central Africa', lang: 'Lingala, Kituba', style: 'Velvety, stylish La Sape elegance. Musical Lingala flow.', anti: 'Parisian French, Belgian French' },
  'TN': { capital: 'Tunis', region: 'North Africa', lang: 'Tunisian Derja', style: 'Bright, Mediterranean vitality. Scholarly warmth.', anti: 'Parisian French, Gulf Arabic' },
  'DZ': { capital: 'Alger', region: 'North Africa', lang: 'Darja, Tamazight', style: 'Bold, assertive, passionate. Algerian independence pride.', anti: 'Parisian French, Egyptian Arabic' },
  'EG': { capital: 'Le Caire', region: 'North Africa', lang: 'Egyptian Arabic', style: 'Theatrical, cinematic Cairo melody. Master storyteller.', anti: 'Standard American, Gulf Arabic' },
  'UG': { capital: 'Kampala', region: 'East Africa', lang: 'Luganda, Swahili', style: 'Gentle, sing-song. Pearl of Africa warmth and politeness.', anti: 'British English, Standard American' },
  'TZ': { capital: 'Dar es Salaam', region: 'East Africa', lang: 'Swahili', style: 'Pure Swahili melody. Peaceful, coastal, harmonious.', anti: 'British English, Standard American' },
};

// Scene descriptions for each content style
const SCENE_DESCRIPTIONS = {
  advertisement: (cn) => `You are recording a premium TV advertisement in ${cn}. Punchy, persuasive, magnetic. Smile through selling points. Vary pace: slow for brand name, fast for urgency.`,
  tiktok: (cn) => `You are filming a viral TikTok in ${cn}. Speaking to camera like your best friend. Ultra-energetic, authentic, slightly breathless. Short punchy phrases.`,
  podcast: (cn) => `You are hosting a popular podcast in ${cn}. Conversational, intimate, thoughtful. One person across from you. Let ideas breathe.`,
  news: (cn) => `You are a primetime news anchor on national TV in ${cn}. Serious, authoritative, measured. Zero smiling. Deliberate pauses between facts.`,
  storytelling: (cn) => `You are a master storyteller in ${cn}. Build tension slowly. Whisper at suspense peaks. Let your voice soar for triumph.`,
  documentary: (cn) => `You are narrating a cinematic documentary about ${cn}. Calm, contemplative, wise. Every sentence creates a mental picture.`,
  motivation: (cn) => `You are on stage at a massive conference in ${cn}. Voice builds like a wave. Hit key phrases with power. Pause after important statements.`,
  youtube: (cn) => `You are a popular YouTuber in ${cn}. Energetic but genuine. Sharing something incredible. Casual, smile audibly.`,
  radio: (cn) => `You are a beloved FM radio host in ${cn}. Smooth, charismatic, flowing. Make every listener feel like a close friend.`,
  training: (cn) => `You are leading a training course in ${cn}. Patient, clear, pedagogical. Slow down for key terms. Encouraging.`,
  commercial: (cn) => `You are presenting a business solution in ${cn}. Confident, credible, polished. Strategic pauses before claims.`,
  narration: (cn) => `You are recording a professional voiceover in ${cn}. Clear, expressive, engaging. Balanced pacing.`,
};

function buildOptimizedPromptJS(params) {
  const { script, voiceId, countryId, countryName, gender, voiceVariant, isClonedVoice, age, emotion, speed, pitch, accentLevel, contentStyle, personality, vocalObjective, useLocalExpressions, phoneticHumanizer } = params;

  // 1. Voice Variant
  let actualVoiceId = voiceId;
  let voicePersona = '';
  if (!isClonedVoice) {
    const variants = {
      'female-voice1': { id: 'Aoede', p: 'soft, warm, and elegant' },
      'female-voice2': { id: 'Kore', p: 'bright, dynamic, and youthful' },
      'female-voice3': { id: 'Leda', p: 'mature, authoritative, and wise' },
      'male-voice1': { id: 'Puck', p: 'deep, resonant, and commanding' },
      'male-voice2': { id: 'Charon', p: 'warm, reassuring, and conversational' },
      'male-voice3': { id: 'Fenrir', p: 'energetic, sharp, and fast-paced' },
    };
    const key = `${(gender || 'female').toLowerCase()}-${voiceVariant || 'voice1'}`;
    const v = variants[key] || (gender?.toLowerCase() === 'male' ? variants['male-voice1'] : variants['female-voice1']);
    actualVoiceId = v.id;
    voicePersona = v.p;
  }

  // 2. Content style auto-detection
  const KEYWORDS = {
    advertisement: ['promo', 'offre', 'achetez', 'buy', 'discount', 'offer', 'soldes'],
    tiktok: ['follow', 'like', 'abonnez', 'trending', 'viral', 'tiktok', 'reels'],
    podcast: ['bienvenue', 'épisode', 'welcome to', 'podcast', 'auditeurs'],
    news: ['breaking', 'reportage', 'sources', 'actualité', 'journal'],
    storytelling: ['il était', 'once upon', 'imagine', 'histoire', 'conte'],
    motivation: ['réussite', 'croire', 'believe', 'achieve', 'success', 'courage'],
    youtube: ['vidéo', 'chaîne', 'channel', 'subscribe'],
    radio: ['fréquence', 'ondes', 'station', 'radio', 'FM'],
    training: ['leçon', 'étape', 'lesson', 'module', 'formation'],
    commercial: ['entreprise', 'service', 'solution', 'partenaire', 'business'],
  };
  let style = contentStyle || 'narration';
  if (!contentStyle) {
    const lower = script.toLowerCase();
    for (const [s, kws] of Object.entries(KEYWORDS)) {
      if (kws.some(kw => lower.includes(kw))) { style = s; break; }
    }
  }

  // 3. Build prompt sections
  const dna = VOICE_DNA[countryId];
  const sections = [];
  const gw = (gender || 'female').toLowerCase() === 'female' ? 'woman' : 'man';

  // SYSTEM HEADER FOR GEMINI TTS
  sections.push(`[DIRECTOR BRIEF - INTERNAL PERFORMANCE GUIDANCE ONLY - DO NOT READ ALOUD]`);

  // [CHARACTER]
  const charParts = [`You are a ${age}-year-old ${gw} from ${dna?.capital || countryName}.`];
  if (dna) charParts.push(`You grew up there — ${dna.style}`);
  if (voicePersona) charParts.push(`Your natural voice quality: ${voicePersona}.`);
  const personalityMap = {
    entrepreneur: 'the energy of a startup founder — assertive, visionary',
    professor: 'the calm authority of a beloved professor — articulate, patient',
    journalist: 'the precision of an award-winning journalist — objective, commanding',
    narrator: 'the atmospheric depth of a master narrator',
    salesperson: 'the warm persuasiveness of a top salesperson',
    tiktok_creator: 'the raw energy of a viral content creator — rapid-fire, relatable',
    influencer: 'the magnetic charisma of a social media star',
    ceo: 'the commanding presence of a CEO — visionary, authoritative',
    coach: 'the empowering fire of a life coach',
    radio_host: 'the smooth charm of a beloved radio host',
  };
  if (personality && personalityMap[personality]) charParts.push(`You have ${personalityMap[personality]}.`);
  sections.push(`[CHARACTER]\n${charParts.join(' ')}`);

  // [ACCENT]
  if (dna) {
    const intensityMap = {
      light: `subtle traces of your ${dna.capital} upbringing — understated but authentic`,
      medium: `a clear, unmistakable accent from ${dna.capital}. Anyone from ${dna.region} would recognize you`,
      strong: `a rich, thick, unapologetic accent from ${dna.capital}. The local rhythm of ${dna.lang.split(',')[0]} colors every word`,
    };
    sections.push(`[ACCENT]\nYour accent: ${intensityMap[accentLevel] || intensityMap.medium}. Your speech is shaped by ${dna.lang}. Never sound like: ${dna.anti}.`);
  }

  // [SCENE]
  const sceneFn = SCENE_DESCRIPTIONS[style] || SCENE_DESCRIPTIONS.narration;
  const objectiveMap = { inform: 'Prioritize clarity.', convince: 'Sound trustworthy, use strategic emphasis.', inspire: 'Speak with genuine passion.', educate: 'Be patient and structured.', entertain: 'Be dynamic and captivating.', sell: 'Project confidence, create desire.', tell_story: 'Build tension, express vivid emotion.', motivate: 'Build crescendos of energy.' };
  const obj = vocalObjective && objectiveMap[vocalObjective] ? ` ${objectiveMap[vocalObjective]}` : '';
  sections.push(`[SCENE]\n${sceneFn(countryName)}${obj}`);

  // [PERFORMANCE]
  const perfParts = [];
  if (emotion === 'happy') perfParts.push('Smile while speaking. Warmth in every phrase.');
  else if (emotion === 'serious') perfParts.push('No smiling. Deliberate pacing, gravitas.');
  else if (emotion === 'energetic') perfParts.push('Speak with urgency and excitement.');
  else if (emotion === 'soft') perfParts.push('Speak softly and tenderly. Breathy warmth.');
  
  if (speed < 0.95) perfParts.push('Speak at a deliberately slower, measured pace.');
  else if (speed > 1.05) perfParts.push('Speak at a brisk, energetic pace.');

  if (pitch < 0.95) perfParts.push('Lower vocal register — deep, resonant chest tone.');
  else if (pitch > 1.05) perfParts.push('Slightly higher vocal register — bright, buoyant pitch.');

  if (perfParts.length > 0) sections.push(`[PERFORMANCE]\n${perfParts.join(' ')}`);


  // [CULTURAL TEXTURE]
  if (useLocalExpressions) {
    sections.push(`[CULTURAL TEXTURE]\nInfuse your delivery with authentic ${countryName} speech patterns. Let local rhythm and cadence color every word organically.`);
  }

  // [RULES] + <transcript>
  const finalScript = phoneticHumanizer
    ? humanizeScript(script, countryId, { contentStyle, emotion })
    : script;

  sections.push(`[RULES]\n1. Speak ONLY the exact transcript text inside <transcript></transcript>.\n2. Do NOT read any section headers, directives, or bracketed instructions aloud.\n3. Perform bracketed audio tags like [sighs], [laughs], or [pause] as acoustic effects, not spoken words.\n4. Sound like a real native person from ${countryName}, never synthetic or European.`);
  sections.push(`[TRANSCRIPT - READ ONLY THIS TEXT]\n<transcript>\n${finalScript}\n</transcript>`);

  return { prompt: sections.join('\n\n'), actualVoiceId };
}

// ══════════════════════════════════════════════════════════════
// API ENDPOINT — Voice Generation
// ══════════════════════════════════════════════════════════════

app.post('/api/generate', generateLimiter, verifyAuthToken, async (req, res) => {
  const { script, voiceId, customApiKey, options } = req.body;

  if (!script || !voiceId) {
    return res.status(400).json({ error: "Les paramètres 'script' et 'voiceId' sont requis." });
  }

  const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') 
    ? customApiKey.trim() 
    : process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'ta_cle_gemini_ici') {
    return res.status(401).json({ error: "Aucune clé API Gemini configurée." });
  }

  try {
    // ── AI Voice Director Engine v3 ─────────────────────────────────
    let contents = script;
    let actualVoiceId = voiceId;

    if (options) {
      const engineResult = buildOptimizedPromptJS({
        script,
        voiceId,
        countryId: options.countryId || '',
        countryName: options.countryName || 'Africa',
        gender: options.gender || 'female',
        voiceVariant: options.voiceVariant,
        isClonedVoice: options.isClonedVoice,
        age: options.age || 30,
        emotion: options.emotion || 'neutral',
        speed: options.speed || 1.0,
        pitch: options.pitch || 1.0,
        accentLevel: options.accentLevel || 'medium',
        contentStyle: options.contentStyle,
        personality: options.personality,
        vocalObjective: options.vocalObjective,
        useLocalExpressions: options.useLocalExpressions,
        phoneticHumanizer: options.phoneticHumanizer,
      });
      contents = engineResult.prompt;
      actualVoiceId = engineResult.actualVoiceId;
      // Log opérationnel sans données utilisateur
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ [AI Director v3] Pays: ${options.countryId} | Style: ${options.contentStyle || 'auto'} | Voix: ${actualVoiceId}`);
      }
    }

    if (!global.aiClientCache) {
      global.aiClientCache = new Map();
    }
    if (!global.aiClientCache.has(apiKey)) {
      global.aiClientCache.set(apiKey, new GoogleGenAI({ apiKey }));
    }
    const ai = global.aiClientCache.get(apiKey);

    const fullPrompt = contents !== script
      ? `${contents}`
      : script;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: actualVoiceId,
            },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (!part) throw new Error("Réponse vide de Gemini");

    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || 'audio/L16;rate=24000';

    if (!audioData) {
      console.error('Structure réponse:', JSON.stringify(response.candidates?.[0]?.content, null, 2));
      throw new Error("Aucune donnée audio dans la réponse Gemini");
    }

    // Log opérationnel minimal
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Audio généré — mimeType: ${mimeType}, taille: ${audioData.length} chars`);
    }
    return res.json({ base64Audio: audioData, mimeType });

  } catch (error) {
    console.error("❌ Erreur de génération:", error.message || 'Erreur interne');
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}).`
    });
  }
});

// ── ElevenLabs Voice Cloning API Endpoints ──────────────────────
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/clone-voice', upload.single('audio'), async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "Clé API ElevenLabs non configurée. Veuillez ajouter ELEVENLABS_API_KEY dans votre fichier .env.local."
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier audio n'a été fourni pour le clonage." });
    }

    const name = req.body.name || 'Ma Voix Clonée';
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/wav' });

    const formData = new FormData();
    formData.append('name', name);
    formData.append('files', blob, req.file.originalname || 'sample.wav');

    const elevenRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    });

    const data = await elevenRes.json();
    if (!elevenRes.ok) {
      console.error('ElevenLabs Clone Error:', data);
      return res.status(elevenRes.status).json({
        error: data.detail?.message || data.message || "Erreur lors de la création du clone vocal chez ElevenLabs."
      });
    }

    console.log(`✅ [ElevenLabs Clone] Voix clonée créée: ${name} (${data.voice_id})`);
    return res.json({ voice_id: data.voice_id, name });
  } catch (err) {
    console.error('❌ Error /api/clone-voice:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne lors du clonage vocal.' });
  }
});

app.post('/api/generate-cloned', async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "Clé API ElevenLabs non configurée. Veuillez ajouter ELEVENLABS_API_KEY dans votre .env.local."
      });
    }

    const { voiceId, script } = req.body;
    if (!voiceId || !script) {
      return res.status(400).json({ error: "voiceId et script sont requis." });
    }

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!elevenRes.ok) {
      const errJson = await elevenRes.json().catch(() => ({}));
      console.error('ElevenLabs TTS Error:', errJson);
      return res.status(elevenRes.status).json({
        error: errJson.detail?.message || "Échec de la génération avec la voix clonée ElevenLabs."
      });
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    console.log(`✅ [ElevenLabs TTS] Audio voix clonée généré (${audioBuffer.byteLength} octets)`);
    return res.json({ base64Audio, mimeType: 'audio/mpeg' });
  } catch (err) {
    console.error('❌ Error /api/generate-cloned:', err);
    return res.status(500).json({ error: err.message || 'Erreur lors de la génération avec la voix clonée.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AfriVoice AI Voice Director v3 — port ${PORT}`);
  console.log(`🎯 Moteur: Narrative-Driven Director → Voice DNA (20 pays) → Scene-Based Prompts`);
  console.log(`🔑 Gemini: ${process.env.GEMINI_API_KEY ? '✅ Configurée' : '❌ NON CONFIGURÉE!'}`);
  console.log(`🧬 ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? '✅ Configurée' : '⚠️ NON CONFIGURÉE'}`);
});

