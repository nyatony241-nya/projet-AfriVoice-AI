import express from 'express';
import cors from 'cors';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
    keyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    engine: 'VoicePromptEngine v2 — AI Voice Director'
  });
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const verifyAuthToken = async (req, res, next) => {
  if (!supabase) {
    console.warn("⚠️ Supabase non configuré. Auth contournée (dev local).");
    return next();
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

// ── Voice DNA (subset des 20 pays — données critiques pour le serveur) ──
const VOICE_DNA = {
  'NG': { capital: 'Abuja/Lagos', region: 'West Africa', localLanguages: ['Hausa', 'Yoruba', 'Igbo', 'Pidgin English'], speechMelody: 'Dynamic, expressive, highly melodic with varied pitch emphasizing key nouns and verbs.', consonantStyle: 'Crisp and pronounced consonants, hard "t" and "d" sounds with deep resonance.', rhythmPattern: 'Syllable-timed, staccato yet flowing and energetic rhythm.', culturalContext: 'Direct, confident, persuasive. Rooted in oral storytelling and lively market interactions.', antiPatterns: ['British RP English', 'Standard American English', 'Australian English'] },
  'CI': { capital: 'Abidjan', region: 'West Africa', localLanguages: ['Baoulé', 'Dioula', 'Nouchi'], speechMelody: 'Musical, warm, expressive with rising intonations at phrase ends.', consonantStyle: 'Softened "r" sounds, distinct nasal vowels, clearly articulated bilabials.', rhythmPattern: 'Bouncy and rhythmic. Syllables elongated for emphasis.', culturalContext: 'Joyful, convivial, influenced by Nouchi rhythm.', antiPatterns: ['Parisian French', 'Canadian French', 'Standard European French'] },
  'CM': { capital: 'Yaoundé/Douala', region: 'Central Africa', localLanguages: ['Ewondo', 'Duala', 'Camfranglais'], speechMelody: 'Deep, resonant, authoritative with robust pitch and deliberate pauses.', consonantStyle: 'Strong percussive consonants, distinct plosives (p, b, t, d, k, g).', rhythmPattern: 'Measured and deliberate, heavy confident cadence.', culturalContext: 'Assertive, serious, deeply grounded. Conveys authority and respect.', antiPatterns: ['Parisian French', 'Standard European French', 'West African French'] },
  'SN': { capital: 'Dakar', region: 'West Africa', localLanguages: ['Wolof', 'Pulaar', 'Jola'], speechMelody: 'Smooth, fluid, polite with gentle cascading intonations.', consonantStyle: 'Softer consonants, Wolof-influenced vowels, lightly tapped "r".', rhythmPattern: 'Flowing and continuous with poetic cadence.', culturalContext: 'Rooted in Teranga (hospitality). Respectful, calm, dignified.', antiPatterns: ['Parisian French', 'Canadian French'] },
  'CD': { capital: 'Kinshasa', region: 'Central Africa', localLanguages: ['Lingala', 'Kikongo', 'Tshiluba'], speechMelody: 'Warm, flowing, musical. Lingala influence creates rhythmic, tonal quality.', consonantStyle: 'Soft, melodic consonants. "R" is light and rolled.', rhythmPattern: 'Rhythmic, dance-like cadence, reflecting Congolese musical heritage.', culturalContext: 'Warm, artistic, resilient. Known for musical expression and lively communication.', antiPatterns: ['Parisian French', 'Belgian French', 'Standard European French'] },
  'GH': { capital: 'Accra', region: 'West Africa', localLanguages: ['Twi', 'Ga', 'Ewe', 'Hausa'], speechMelody: 'Clear, educated, warm with slight tonal quality from Akan languages.', consonantStyle: 'Precise articulation, clear vowels, softened final consonants.', rhythmPattern: 'Moderate, dignified pace with confident stress patterns.', culturalContext: 'Educated, proud, warm. Known for hospitality and strong civic identity.', antiPatterns: ['British RP English', 'Standard American English'] },
  'MA': { capital: 'Casablanca/Rabat', region: 'North Africa', localLanguages: ['Darija', 'Amazigh', 'Modern Standard Arabic'], speechMelody: 'Melodic with Arabic musical phrasing, French-influenced rhythm.', consonantStyle: 'Strong guttural sounds from Arabic, softened by French influence.', rhythmPattern: 'Flowing bilingual rhythm switching smoothly between Arabic and French patterns.', culturalContext: 'Sophisticated, cosmopolitan, rooted in Maghrebi culture and French-Arabic fusion.', antiPatterns: ['Parisian French', 'Standard Arabic', 'Egyptian Arabic'] },
  'ZA': { capital: 'Johannesburg', region: 'Southern Africa', localLanguages: ['Zulu', 'Xhosa', 'Sotho', 'Afrikaans'], speechMelody: 'Clear, multicultural, confident. Subtle click consonant influence from Nguni languages.', consonantStyle: 'Crisp consonants, click-influenced subtleties in certain vowel formations.', rhythmPattern: 'Moderate, professional, urban pace reflecting multicultural Johannesburg.', culturalContext: 'Modern, diverse, resilient. Ubuntu philosophy shapes warm community-minded tone.', antiPatterns: ['British RP English', 'Australian English'] },
  'KE': { capital: 'Nairobi', region: 'East Africa', localLanguages: ['Kikuyu', 'Luo', 'Kamba', 'Swahili'], speechMelody: 'Crisp, articulate, educated. Swahili influence adds melodic Bantu tonal quality.', consonantStyle: 'Clear, precise consonants with Swahili-influenced vowel purity.', rhythmPattern: 'Brisk, professional, urban pace. East African syllable rhythm.', culturalContext: 'Ambitious, entrepreneurial, educated. Nairobi as a tech hub shapes confident modern voice.', antiPatterns: ['British English', 'Standard American English'] },
  'GA': { capital: 'Libreville', region: 'Central Africa', localLanguages: ['Fang', 'Myene', 'Nzebi'], speechMelody: 'Smooth, elegant, refined. Central African French with soft melodic quality.', consonantStyle: 'Softened consonants, elegant French-influenced articulation.', rhythmPattern: 'Relaxed, measured, sophisticated cadence.', culturalContext: 'Calm, cultivated, oil-rich nation confidence. Diplomatic and measured in expression.', antiPatterns: ['Parisian French', 'Canadian French', 'Belgian French', 'Standard European French'] },
  'BJ': { capital: 'Cotonou', region: 'West Africa', localLanguages: ['Fon', 'Yoruba', 'Bariba'], speechMelody: 'Warm, storytelling-rich cadence with Fon and Yoruba tonal influences.', consonantStyle: 'Rounded consonants, gentle articulation influenced by Fon language.', rhythmPattern: 'Lyrical, flowing rhythm. Narrative-style pacing.', culturalContext: 'Rich oral tradition and Vodoun culture. Expressive, warm, deeply connected to ancestral wisdom.', antiPatterns: ['Parisian French', 'Standard European French', 'Nigerian Pidgin'] },
  'BF': { capital: 'Ouagadougou', region: 'West Africa', localLanguages: ['Mooré', 'Dioula', 'Fulfulde'], speechMelody: 'Grounded, warm, measured. Mooré language creates steady tonal bass.', consonantStyle: 'Strong aspirated consonants from Mooré, softened in French delivery.', rhythmPattern: 'Slow to moderate, dignified pacing. Emphasis on syllable weight.', culturalContext: 'Deeply grounded, communal, resilient. Land of honest people (Pays des hommes intègres).', antiPatterns: ['Parisian French', 'Ivorian French', 'Standard European French'] },
  'ML': { capital: 'Bamako', region: 'West Africa', localLanguages: ['Bambara', 'Fulfulde', 'Soninke'], speechMelody: 'Rich, griot-inspired storytelling tone. Deep, musical, ancestral.', consonantStyle: 'Percussive consonants from Bambara, with warm open vowels.', rhythmPattern: 'Flowing like a griot performance, with narrative peaks and gentle cadences.', culturalContext: 'Ancient Mali Empire legacy. Voice is instrument for history, wisdom, and community.', antiPatterns: ['Parisian French', 'Standard European French', 'Senegalese French'] },
  'TG': { capital: 'Lomé', region: 'West Africa', localLanguages: ['Ewe', 'Kabiyé', 'Tem'], speechMelody: 'Gentle, warm, Ewe tonal music influence creates natural melodic phrasing.', consonantStyle: 'Soft consonants influenced by Ewe language tonal system.', rhythmPattern: 'Relaxed, melodic, unhurried rhythm reflecting coastal Lomé lifestyle.', culturalContext: 'Peaceful, artisanal, coastal. Voice reflects Lomé market warmth and Gulf of Guinea identity.', antiPatterns: ['Parisian French', 'Standard European French', 'Ghanaian English'] },
  'CG': { capital: 'Brazzaville', region: 'Central Africa', localLanguages: ['Lingala', 'Kituba', 'Lari'], speechMelody: 'Warm, Lingala-musical. Rich bass quality with flowing Central African cadence.', consonantStyle: 'Melodic, soft consonants. Lingala musical influence on French delivery.', rhythmPattern: 'Flowing, musical rhythm. Congo River pace — steady, deep, continuous.', culturalContext: 'Artistic, musical, Congo Basin identity. Strong Lingala cultural pride.', antiPatterns: ['Parisian French', 'Belgian French', 'Congolese DRC style'] },
  'TN': { capital: 'Tunis', region: 'North Africa', localLanguages: ['Tunisian Darija', 'Modern Standard Arabic'], speechMelody: 'Mediterranean warmth with Arabic musicality. More nasal French than Moroccan.', consonantStyle: 'French-influenced articulation with Arabic guttural depth.', rhythmPattern: 'Moderate, Mediterranean pace. Thoughtful pauses, scholarly rhythm.', culturalContext: 'Ancient Carthaginian heritage. Educated, democratic-minded, Mediterranean-Arab identity.', antiPatterns: ['Parisian French', 'Moroccan Darija', 'Egyptian Arabic'] },
  'DZ': { capital: 'Alger', region: 'North Africa', localLanguages: ['Algerian Darija', 'Tamazight', 'Modern Standard Arabic'], speechMelody: 'Bold, direct, Mediterranean-Arab. French-Algerian creole rhythm.', consonantStyle: 'Strong Arabic consonants, French-influenced syllable structure.', rhythmPattern: 'Energetic, assertive, direct. City pace of Algiers.', culturalContext: 'Revolution heritage, independence pride, strong cultural identity blending Amazigh, Arab and French.', antiPatterns: ['Parisian French', 'Moroccan Darija', 'Tunisian Arabic'] },
  'EG': { capital: 'Le Caire', region: 'North Africa', localLanguages: ['Egyptian Arabic', 'Sa\'idi Arabic'], speechMelody: 'Classic Egyptian Arabic musicality — the most recognized Arabic accent globally.', consonantStyle: 'Distinctive "j" as "g" (Cairo dialect), warm open vowels, guttural depth.', rhythmPattern: 'Measured, expressive, cinematic. Egyptian media has shaped a global standard.', culturalContext: '7,000 years of civilization. Confident, cultural center, reference for Arab media.', antiPatterns: ['Modern Standard Arabic', 'Levantine Arabic', 'Gulf Arabic', 'Moroccan Darija'] },
  'UG': { capital: 'Kampala', region: 'East Africa', localLanguages: ['Luganda', 'Acholi', 'Langi', 'Swahili'], speechMelody: 'Warm, measured, Luganda-influenced tonal quality blended with clear English.', consonantStyle: 'Clear English consonants with Bantu-influenced vowel purity.', rhythmPattern: 'Steady, dignified East African pace. Kampala urban confidence.', culturalContext: 'Pearl of Africa identity. Warm, hospitable, proud East African nation.', antiPatterns: ['British English', 'Kenyan English', 'Standard American English'] },
  'TZ': { capital: 'Dar es Salaam', region: 'East Africa', localLanguages: ['Swahili', 'Sukuma', 'Chaga'], speechMelody: 'Swahili-pure, melodic, East African warmth. Most musically Bantu of all East African voices.', consonantStyle: 'Pure Bantu consonants from Swahili — no clicks, clear open vowels.', rhythmPattern: 'Flowing, musical, slightly slower than Kenyan. Coastal Dar es Salaam ease.', culturalContext: 'Swahili cultural heart. Tanzania as cradle of ujamaa (communal solidarity). Warm and inclusive.', antiPatterns: ['British English', 'Kenyan English', 'Standard American English'] }
};

// ── AI Voice Director: Prompt Builder (JS port du VoicePromptEngine TS) ──
function buildOptimizedPromptJS(params) {
  const { script, voiceId, countryId, countryName, gender, voiceVariant, isClonedVoice, age, emotion, speed, pitch, accentLevel, contentStyle, personality, vocalObjective, expertMode, expertSettings, useLocalExpressions } = params;

  // 1. Voice Variant Mapping
  let actualVoiceId = voiceId;
  let voicePersona = 'A natural and expressive voice.';
  if (!isClonedVoice) {
    const variantMap = {
      'female-voice1': { id: 'Aoede', persona: 'Soft, calm, elegant narrator' },
      'female-voice2': { id: 'Kore', persona: 'Dynamic, energetic, bright' },
      'female-voice3': { id: 'Aoede', persona: 'Mature, authoritative, wise' },
      'male-voice1': { id: 'Puck', persona: 'Deep, resonant, imposing' },
      'male-voice2': { id: 'Charon', persona: 'Warm, friendly, reassuring' },
      'male-voice3': { id: 'Fenrir', persona: 'Energetic, fast-paced, punchy' },
    };
    const key = `${(gender || 'female').toLowerCase()}-${voiceVariant || 'voice1'}`;
    if (variantMap[key]) {
      actualVoiceId = variantMap[key].id;
      voicePersona = variantMap[key].persona;
    } else {
      actualVoiceId = gender?.toLowerCase() === 'male' ? 'Puck' : 'Aoede';
      voicePersona = gender?.toLowerCase() === 'male' ? 'Deep, resonant, imposing' : 'Soft, calm, elegant narrator';
    }
  }

  // 2. Content Style Detection
  const CONTENT_KEYWORDS = {
    advertisement: ['promo', 'offre', 'achetez', 'buy', 'limited', 'discount', 'offer', 'soldes', 'remise'],
    tiktok: ['follow', 'like', 'abonnez', 'trending', 'viral', 'tiktok', 'reels'],
    podcast: ['bienvenue', 'épisode', 'welcome to', 'episode', 'podcast', 'auditeurs'],
    news: ['breaking', 'reportage', 'sources', 'information', 'actualité', 'journal'],
    storytelling: ['il était', 'once upon', 'imagine', 'histoire', 'conte'],
    motivation: ['réussite', 'croire', 'believe', 'achieve', 'success', 'courage'],
    youtube: ['vidéo', 'chaîne', 'channel', 'subscribe'],
    radio: ['fréquence', 'ondes', 'station', 'radio', 'FM'],
    training: ['leçon', 'étape', 'lesson', 'step', 'module', 'formation'],
    commercial: ['entreprise', 'service', 'solution', 'partenaire', 'business'],
  };
  let detectedStyle = contentStyle || 'narration';
  if (!contentStyle) {
    const lowerScript = script.toLowerCase();
    for (const [style, kws] of Object.entries(CONTENT_KEYWORDS)) {
      if (kws.some(kw => lowerScript.includes(kw.toLowerCase()))) { detectedStyle = style; break; }
    }
  }

  // 3. Accent Profile
  const dna = VOICE_DNA[countryId];
  let accentProfile;
  if (!dna) {
    accentProfile = `=== CHARACTER IDENTITY ===\nYou are a ${age}-year-old ${gender} from Sub-Saharan Africa.\nINTENSITY: Clear and warm African accent with natural local rhythm.\nCRITICAL ANTI-PATTERNS (DO NOT SOUND LIKE THESE): Standard American English, British RP, Parisian French, Generic TTS.`;
  } else {
    const intensityMap = {
      light: `Slight hints of ${countryId} accent, mostly neutral but with occasional local rhythm`,
      medium: `Clear and unmistakable ${countryId} accent. Native speaker who grew up in ${dna.capital}.`,
      strong: `Extremely thick, unapologetic ${countryId} accent. Every syllable drips with local identity.`
    };
    const intensity = intensityMap[accentLevel] || intensityMap.medium;
    accentProfile = [
      `=== CHARACTER IDENTITY ===`,
      `You are a ${age}-year-old ${gender} from ${dna.capital}, ${countryId} (${dna.region}).`,
      `INTENSITY: ${intensity}`,
      `SPEECH MELODY: ${dna.speechMelody}`,
      `CONSONANT STYLE: ${dna.consonantStyle}`,
      `RHYTHM PATTERN: ${dna.rhythmPattern}`,
      `CULTURAL CONTEXT: ${dna.culturalContext}`,
      `Local languages that shape your speech: ${dna.localLanguages.join(', ')}.`,
      `CRITICAL ANTI-PATTERNS (DO NOT SOUND LIKE THESE): ${dna.antiPatterns.join(', ')}.`
    ].join('\n');
  }

  // 4. Personality mapping
  const personalityMap = {
    entrepreneur: 'Speak like a confident entrepreneur presenting a business idea. Assertive, visionary, and compelling.',
    professor: 'Speak like a university professor. Articulate, patient, pedagogical, and slightly formal.',
    student: 'Speak like a young enthusiastic student. Fresh, curious, slightly informal, and relatable.',
    journalist: 'Speak like a professional news anchor. Objective, precise, measured, with gravitas.',
    narrator: 'Speak like a seasoned documentary narrator. Rich, atmospheric, drawing the listener in.',
    salesperson: 'Speak like a top salesperson. Persuasive, warm, trustworthy.',
    tiktok_creator: 'Speak like a viral TikTok creator. Ultra-energetic, punchy, modern, rapid-fire delivery.',
    influencer: 'Speak like a social media influencer. Relatable, charismatic, trendy, smile in voice.',
    ceo: 'Speak like a CEO giving a keynote. Commanding, visionary, authoritative yet approachable.',
    coach: 'Speak like a motivational coach. Empowering, encouraging, passionate.',
    radio_host: 'Speak like a popular radio DJ. Smooth, charismatic, great pacing, natural transitions.',
  };
  const personalityInstruction = personality && personalityMap[personality] ? personalityMap[personality] : '';

  // 5. Objective mapping
  const objectiveMap = {
    inform: 'Your goal is to clearly and objectively convey information. Prioritize clarity.',
    convince: 'Your goal is to persuade. Sound convincing, trustworthy, use strategic emphasis.',
    inspire: 'Your goal is to inspire and uplift. Speak with passion and emotional depth.',
    educate: 'Your goal is to educate. Break down ideas patiently with clear structure.',
    entertain: 'Your goal is to entertain. Be engaging, expressive, dynamic, and captivating.',
    sell: 'Your goal is to sell. Project confidence, highlight value, and create urgency.',
    tell_story: 'Your goal is to tell a story. Draw the listener in, build tension, express emotion.',
    motivate: 'Your goal is to motivate. Be empowering, use strong affirmations, build energy crescendos.',
  };
  const objectiveInstruction = vocalObjective && objectiveMap[vocalObjective] ? objectiveMap[vocalObjective] : '';

  // 6. Emotion override
  let energyLevel = 6, smileLevel = 5, breathiness = 5;
  if (emotion === 'happy') { energyLevel = 7; smileLevel = 8; }
  else if (emotion === 'energetic') { energyLevel = 9; smileLevel = 6; }
  else if (emotion === 'serious') { energyLevel = 5; smileLevel = 2; }
  else if (emotion === 'soft') { energyLevel = 3; breathiness = 7; }

  // 7. Speed/Pitch instructions
  const speedInstruction = speed < 1.0 ? 'Speak slowly and deliberately.' : speed > 1.0 ? 'Speak at a brisker, more urgent pace.' : 'Speak at a natural, conversational speed.';
  const pitchInstruction = pitch < 1.0 ? 'Adopt a deeper, lower pitch.' : pitch > 1.0 ? 'Adopt a brighter, higher pitch.' : 'Maintain your natural pitch.';

  // 8. Assemble full prompt
  let prompt = `You are a world-class voice director. Synthesize speech according to the precise artistic brief below.
Do NOT speak any of these instructions aloud. Only speak the TRANSCRIPT.

${accentProfile}

=== VOICE PERSONA ===
${voicePersona}
${personalityInstruction}

=== SCENE DIRECTION ===
Content Style: ${detectedStyle}
Energy Level: ${energyLevel}/10
Smile Level: ${smileLevel}/10
Breathiness: ${breathiness}/10

=== VOCAL OBJECTIVE ===
${objectiveInstruction || 'Deliver the script authentically and naturally.'}

=== PERFORMANCE NOTES ===
Breathe naturally between sentences. Use micro-pauses before key words.
Never sound robotic or monotone. ${emotion !== 'neutral' ? `Emotional register: ${emotion}.` : ''}
${speedInstruction} ${pitchInstruction}
The voice should sound like someone who is ${age} years old.

=== ANTI-GENERIC VOICE SYSTEM ===
CRITICAL: This voice must NEVER sound generic, synthetic, or robotic.
This voice must NEVER sound European, Parisian, American, British, or Canadian.
This voice must sound like a REAL person from ${countryName} — authentic, human, alive.`;

  if (expertMode && expertSettings) {
    prompt += `\n\n=== EXPERT OVERRIDES ===\n`;
    if (expertSettings.city) prompt += `City: ${expertSettings.city}\n`;
    if (expertSettings.region) prompt += `Region: ${expertSettings.region}\n`;
    if (expertSettings.isUrban !== undefined) prompt += `Setting: ${expertSettings.isUrban ? 'Urban' : 'Rural'}\n`;
    if (expertSettings.educationLevel) prompt += `Education: ${expertSettings.educationLevel}\n`;
    if (expertSettings.energy) prompt += `Energy Override: ${expertSettings.energy}/10\n`;
    if (expertSettings.expressiveness) prompt += `Expressiveness: ${expertSettings.expressiveness}/10\n`;
    if (expertSettings.smile) prompt += `Smile: ${expertSettings.smile}/10\n`;
    if (expertSettings.charisma) prompt += `Charisma: ${expertSettings.charisma}/10\n`;
  }

  if (useLocalExpressions) {
    prompt += `\n\nLocal rhythm: Emphasize regional native speech patterns and local cadence.`;
  }

  prompt += `\n\n########## TRANSCRIPT ##########\n${script}`;

  return { prompt, actualVoiceId };
}

// ── Endpoint de génération vocale ──────────────────────────────────────────
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
    // ── AI Voice Director Engine ────────────────────────────────────────
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
        expertMode: options.expertMode,
        expertSettings: options.expertSettings,
        useLocalExpressions: options.useLocalExpressions,
      });
      contents = engineResult.prompt;
      actualVoiceId = engineResult.actualVoiceId;
      console.log(`✅ [AI Director] Pays: ${options.countryId} | Accent: ${options.accentLevel} | Style: ${options.contentStyle || 'auto'} | Voix: ${actualVoiceId}`);
      console.log(`📝 Prompt (${contents.length} chars): ${contents.substring(0, 120)}...`);
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: contents,
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

    console.log(`✅ Audio généré — mimeType: ${mimeType}, taille: ${audioData.length} chars`);
    return res.json({ base64Audio: audioData, mimeType });

  } catch (error) {
    console.error("❌ Erreur:", error.message || error);
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}).`
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AfriVoice AI Voice Director v2 — port ${PORT}`);
  console.log(`🎯 Moteur: AI Voice Director → Voice DNA (20 pays) → Accent Intelligence → Humanizer`);
  console.log(`🔑 Gemini: ${process.env.GEMINI_API_KEY ? '✅ Configurée' : '❌ NON CONFIGURÉE!'}`);
});
