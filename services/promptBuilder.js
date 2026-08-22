// ──────────────────────────────────────────────────────────────
// Unified Prompt Builder & AI Voice Director Engine
// Shareable between ES Modules (Node.js) and TypeScript (Vite/Vercel)
// ──────────────────────────────────────────────────────────────

import { VOICE_DNA, LOCAL_EXPRESSIONS } from './voiceDNA.js';

// Voice Name Mapping
const VOICE_MAP = {
  'female-voice1': 'Aoede',
  'female-voice2': 'Kore',
  'female-voice3': 'Leda',
  'male-voice1': 'Puck',
  'male-voice2': 'Charon',
  'male-voice3': 'Fenrir',
};

// Scene Descriptions by Content Type
const CONTENT_SCENES = {
  advertisement: (cn) => `You are recording a premium TV/radio advertisement for a major brand in ${cn}. The studio is high-end, the microphone is close. Your delivery is punchy, persuasive, and magnetic — every word must make the listener want to buy. Smile through key selling points. Vary your pace: slow down for the brand name, speed up for urgency.`,
  tiktok: (cn) => `You are filming a viral TikTok/Reels video in ${cn}. You speak directly to the camera like you're talking to your best friend. Ultra-energetic, authentic, slightly breathless with excitement. Short punchy phrases. Natural laughs and reactions. Sound like a real creator, not a voiceover.`,
  podcast: (cn) => `You are hosting a popular podcast recorded in a cozy studio in ${cn}. Conversational, intimate, thoughtful. Speak as if one person is sitting across from you. Take your time. Let ideas breathe. Use gentle emphasis and natural thinking pauses between thoughts.`,
  news: (cn) => `You are a trusted primetime news anchor on national television in ${cn}. Serious, authoritative, measured. Every word carries weight. Your pacing is deliberate and even. Zero smiling — absolute gravitas. Pause between major facts to let them land.`,
  storytelling: (cn) => `You are a master storyteller sitting by firelight in ${cn}, captivating a spellbound audience. Build tension slowly. Whisper when the suspense peaks. Let your voice soar when the hero triumphs. Use dramatic pauses. Every sentence is a brushstroke painting a vivid scene.`,
  documentary: (cn) => `You are narrating a cinematic documentary about ${cn}. Your voice is the bridge between images and understanding. Calm, contemplative, wise. Speak slowly enough that every sentence creates a mental picture. Reverent when describing heritage. Measured when presenting facts.`,
  motivation: (cn) => `You are on stage at a massive conference in ${cn}. Thousands of people are watching. Your voice builds like a wave — starting calm and thoughtful, then rising with conviction. Hit key phrases with powerful emphasis. Pause after your most important statements to let them echo.`,
  youtube: (cn) => `You are a popular YouTuber recording in your studio in ${cn}. Energetic but genuine. You speak with natural enthusiasm as if sharing something incredible with your community. Casual transitions between topics. Smile audibly. Throw in natural reactions.`,
  radio: (cn) => `You are a beloved radio host on a major FM station in ${cn}. Your voice fills the airwaves with warmth and charisma. Smooth, flowing delivery. Natural transitions. You make the listener feel like a close friend. Playful when appropriate, warm always.`,
  training: (cn) => `You are leading an online training course for professionals in ${cn}. Patient, clear, pedagogical. Break ideas into digestible pieces. Emphasize key terms by slightly slowing down. Repeat important concepts naturally. Sound encouraging and approachable.`,
  commercial: (cn) => `You are presenting a business solution at a professional event in ${cn}. Confident, credible, polished. Your delivery inspires trust. Use strategic pauses before important claims. Sound like someone who deeply believes in what they're presenting.`,
  narration: (cn) => `You are recording a professional voiceover in a studio in ${cn}. Versatile, clear, and expressive. Your natural storytelling ability shines through — engaging without being theatrical. Balanced pacing with subtle emotional nuances.`,
};

// Personality description mappings
const PERSONALITY_MAP = {
  entrepreneur: 'You have the energy of a startup founder pitching to investors — assertive, visionary, every word chosen for impact.',
  professor: 'You have the calm authority of a beloved university professor — articulate, patient, making complex ideas feel simple.',
  student: 'You have the fresh enthusiasm of a bright student — curious, slightly informal, genuinely excited to share.',
  journalist: 'You have the precision and gravitas of an award-winning journalist — objective, crisp, commanding attention.',
  narrator: 'You have the atmospheric depth of a master narrator — drawing listeners into the story with every syllable.',
  salesperson: 'You have the warm persuasiveness of a top salesperson — trustworthy, strategic with pauses, naturally convincing.',
  tiktok_creator: 'You have the raw, authentic energy of a viral content creator — rapid-fire, relatable, zero filter.',
  influencer: 'You have the magnetic charisma of a social media star — trendy, relatable, with a permanent smile in your voice.',
  ceo: 'You have the commanding presence of a Fortune 500 CEO — visionary, authoritative, every sentence carefully weighted.',
  coach: 'You have the empowering fire of a life coach — building people up, passionate crescendos, making listeners believe in themselves.',
  radio_host: 'You have the smooth charm of a beloved radio host — perfect pacing, natural transitions, making every listener feel special.',
};

// Objective description mappings
const OBJECTIVE_MAP = {
  inform: 'Your purpose is to inform clearly — prioritize comprehension above all.',
  convince: 'Your purpose is to convince — sound trustworthy and use strategic emphasis on key arguments.',
  inspire: 'Your purpose is to inspire — speak with genuine passion and emotional conviction.',
  educate: 'Your purpose is to educate — be patient, structured, and encouraging.',
  entertain: 'Your purpose is to entertain — be dynamic, expressive, and captivating.',
  sell: 'Your purpose is to sell — project confidence, highlight value, create desire.',
  tell_story: 'Your purpose is to tell a story — build tension, express vivid emotion, draw the listener in.',
  motivate: 'Your purpose is to motivate — use strong affirmations and build crescendos of energy.',
};

// Emotion description mappings
const EMOTION_MAP = {
  happy: 'Your mood is genuinely happy — smile while speaking, let warmth and brightness color every phrase. Slightly higher pitch, slightly faster pace.',
  serious: 'Your mood is serious and focused — no smiling, deliberate pacing, gravitas in every word. Lower register, measured delivery.',
  energetic: 'Your mood is electric with energy — speak with urgency and excitement, as if sharing thrilling news. Fast-paced but articulate.',
  soft: 'Your mood is gentle and soothing — speak softly and tenderly, like comforting someone you care about. Slower pace, breathy warmth.',
};

/**
 * Builds the complete structured prompt for Gemini TTS.
 */
export function buildDirectorPrompt(params) {
  const {
    script,
    voiceId,
    voiceIdentity,     // VoiceIdentity from registry (optional, takes precedence)
    countryId: reqCountryId,
    countryName,
    gender = 'female',
    voiceVariant = 'voice1',
    age = 30,
    accentLevel = 'strong',
    useLocalExpressions = false,
    emotion = 'neutral',
    contentStyle = 'narration',
    personality,
    vocalObjective,
    speed = 1.0,
    pitch = 1.0,
    phoneticScript = null, // Can pass pre-processed humanized script
  } = params;

  // Resolve Country ID
  let countryId = (reqCountryId || '').toUpperCase();
  if (countryId === 'CD') countryId = 'CG'; // Legacy alias

  if (!countryId || !VOICE_DNA[countryId]) {
    const match = Object.keys(VOICE_DNA).find(id => {
      const dna = VOICE_DNA[id];
      return countryName.toLowerCase().includes(id.toLowerCase()) ||
             countryName.toLowerCase().includes(dna.capital.toLowerCase()) ||
             dna.region.toLowerCase().includes(countryName.toLowerCase());
    });
    countryId = match || 'CI';
  }

  const dna = VOICE_DNA[countryId];

  // FIXED VOICE IDENTITY: Registry takes precedence over dynamic lookup
  const voiceKey = `${gender.toLowerCase()}-${voiceVariant}`;
  const actualVoiceId = voiceIdentity?.providerVoiceId || VOICE_MAP[voiceKey] || (gender.toLowerCase() === 'female' ? 'Aoede' : 'Puck');
  const voicePersona = gender.toLowerCase() === 'female' ? 'warm, clear, and engaging' : 'deep, resonant, and reassuring';

  // Construct stable, permanent voiceProfileId — use registry ID if available
  const voiceProfileId = voiceIdentity?.voiceId || `${countryId}_${contentStyle.toUpperCase()}_${gender.toUpperCase()}_${voiceVariant.toUpperCase()}`;
  
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log(`🎙️ [Voice Profile Locked] Profile ID: ${voiceProfileId} | Provider Voice: ${actualVoiceId}`);
  }

  // ── COMPACT PROMPT STRATEGY ──────────────────────────────────────
  // The old multi-section prompt was ~3000-4000 chars of instructions
  // BEFORE the user script, pushing total tokens near Gemini TTS's
  // 8192-token limit → silent empty responses.
  // Solution: one dense, high-signal paragraph ~500-700 chars max.
  // Voice quality comes from voiceName selection, not instruction length.
  // ─────────────────────────────────────────────────────────────────

  const gw = gender.toLowerCase() === 'female' ? 'woman' : 'man';

  // Core accent descriptor — max 1 sentence
  const accentLine = accentLevel === 'light'
    ? `You have a subtle ${countryName} (${dna.capital}) accent, polished and professional.`
    : `You have a thick, authentic native accent from ${countryName} (${dna.capital}), rooted in ${dna.localLanguages[0]}.`;

  // Scene in 1 sentence
  const sceneFn = CONTENT_SCENES[contentStyle] || CONTENT_SCENES.narration;
  const sceneOneLiner = sceneFn(countryName).split('.')[0] + '.';

  // Emotion in ≤1 sentence
  const activeEmotion = emotion.toLowerCase();
  const emotionLine = EMOTION_MAP[activeEmotion]
    ? EMOTION_MAP[activeEmotion].split('.')[0] + '.'
    : '';

  // Pace/pitch modifiers — only when non-default
  const modifiers = [];
  if (speed < 0.95) modifiers.push('Speak slowly and deliberately.');
  else if (speed > 1.05) modifiers.push('Speak at a brisk, energetic pace.');
  if (pitch < 0.95) modifiers.push('Use a deep, resonant chest tone.');
  else if (pitch > 1.05) modifiers.push('Use a bright, slightly higher register.');

  // Local expressions — max 3 fillers
  let expressionLine = '';
  if (useLocalExpressions && LOCAL_EXPRESSIONS[countryId]) {
    const ex = LOCAL_EXPRESSIONS[countryId];
    expressionLine = `Natural speech fillers: ${ex.fillers.slice(0, 2).join(', ')}.`;
  }

  // Personality — 1 sentence max
  const personalityLine = (personality && PERSONALITY_MAP[personality])
    ? PERSONALITY_MAP[personality].split('.')[0] + '.'
    : '';

  // Build the compact brief — targeting ~600 chars total (well under token limit)
  const compactBrief = [
    `You are a ${age}-year-old ${gw} born and raised in ${countryName}. ${accentLine}`,
    sceneOneLiner,
    emotionLine,
    personalityLine,
    expressionLine,
    modifiers.join(' '),
    `Speak ONLY the text inside <transcript>. Never read instructions aloud.`,
  ].filter(Boolean).join(' ');

  // TRANSCRIPT placed last per Gemini best practices
  const finalTranscript = phoneticScript || script;
  const directorBrief = `${compactBrief}\n\n<transcript>\n${finalTranscript.trim()}\n</transcript>`;

  return {
    directorBrief,
    actualVoiceId,
  };
}

