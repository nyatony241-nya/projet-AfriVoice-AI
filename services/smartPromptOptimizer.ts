import type {
  DirectorDecision,
  VocalPersonality,
  VocalObjective,
  ExpertSettings,
} from '../types';
import { VOICE_DNA } from './voiceDNA';

// ──────────────────────────────────────────────────────
// LOCAL EXPRESSION LIBRARIES (per-country interjections)
// These are culturally-authentic filler words and 
// interjections that a real native speaker would use.
// ──────────────────────────────────────────────────────
const LOCAL_EXPRESSIONS: Record<string, { fillers: string[]; greetings: string[]; emphasis: string[] }> = {
  NG: {
    fillers: ['you know', 'I tell you', 'my brother', 'my sister', 'ehn'],
    greetings: ['How far?', 'How body?', 'Wetin dey?'],
    emphasis: ['I swear!', 'Na so!', 'For real!'],
  },
  CI: {
    fillers: ['dêh', 'wôrô-wôrô', 'kpakpatoya', 'on dit quoi'],
    greetings: ['Ça va ou bien?', 'C\'est comment?'],
    emphasis: ['C\'est chaud!', 'Walahi!', 'Dieu merci!'],
  },
  CM: {
    fillers: ['c\'est ça même', 'je dis seulement', 'tu vois non'],
    greetings: ['Wèè!', 'C\'est comment?'],
    emphasis: ['Aïe!', 'Tu vois!', 'Mon frère!'],
  },
  SN: {
    fillers: ['ndéysan', 'wàllu', 'nanga déf?'],
    greetings: ['Salaam aleekum', 'Na nga def?'],
    emphasis: ['Yalla!', 'Inchallah!', 'Machallah!'],
  },
  CD: {
    fillers: ['pona nini', 'yo', 'eh bien', 'mbote'],
    greetings: ['Mbote na yo!', 'Oza bien?'],
    emphasis: ['Tozali!', 'Eh eh!', 'Pesa ngai!'],
  },
  GH: {
    fillers: ['chale', 'as for me', 'you see'],
    greetings: ['Ete sen?', 'Wo ho te sen?'],
    emphasis: ['Charley!', 'Herh!', 'Ei!'],
  },
  MA: {
    fillers: ['walakin', 'yak', 'safi'],
    greetings: ['Labas?', 'Kif dayr?'],
    emphasis: ['Wallah!', 'Bismillah!', 'Ya Salaam!'],
  },
  ZA: {
    fillers: ['shame', 'just now', 'hey man'],
    greetings: ['Howzit?', 'Aweh!'],
    emphasis: ['Eish!', 'Haibo!', 'Yoh!'],
  },
  KE: {
    fillers: ['si you know', 'ati', 'lakini'],
    greetings: ['Sasa!', 'Mambo vipi?'],
    emphasis: ['Aki!', 'Kweli!', 'Buana!'],
  },
  GA: {
    fillers: ['disons', 'non mais', 'voilà quoi'],
    greetings: ['Mbolo!', 'Tu vas?'],
    emphasis: ['Ah bon?', 'C\'est sérieux!'],
  },
  BJ: {
    fillers: ['kpèkpè', 'à côté de ça', 'voilà'],
    greetings: ['A fon gbé?', 'Kudo?'],
    emphasis: ['Azô!', 'Vodun!'],
  },
  BF: {
    fillers: ['bon', 'ça va aller', 'en tout cas'],
    greetings: ['Laafi?', 'Bala?'],
    emphasis: ['Inch\'Allah!', 'C\'est sûr!'],
  },
  ML: {
    fillers: ['i ni wula', 'bon', 'voilà'],
    greetings: ['I ni sogoma!', 'I ni ce!'],
    emphasis: ['Wallahi!', 'Barika!'],
  },
  TG: {
    fillers: ['éfè', 'bon', 'n\'est-ce pas'],
    greetings: ['Efoa?', 'Ndi!'],
    emphasis: ['Yoo!', 'Ah!'],
  },
  CG: {
    fillers: ['mundele', 'eh bien', 'c\'est ça'],
    greetings: ['Mbote!', 'Yo nzala?'],
    emphasis: ['Lokola!', 'C\'est fort!'],
  },
  TN: {
    fillers: ['barcha', 'ya3ni', 'voilà'],
    greetings: ['Chnahwelek?', 'Labès?'],
    emphasis: ['Wallahi!', 'Ya hasra!', 'Inchallah!'],
  },
  DZ: {
    fillers: ['bezaf', 'saha', 'wach'],
    greetings: ['Wach rak?', 'Saha!'],
    emphasis: ['Wallah!', 'Ya Rebbi!', 'Saha!'],
  },
  EG: {
    fillers: ['ya3ni', 'tab3an', 'ma3lesh'],
    greetings: ['Ezzayak?', 'Ahlan wa sahlan!'],
    emphasis: ['Wallahi!', 'Ya Salam!', 'Yalla!'],
  },
  UG: {
    fillers: ['banange', 'actually', 'you see'],
    greetings: ['Oli otya?', 'Gyendi!'],
    emphasis: ['Bambi!', 'Banange!', 'Webale!'],
  },
  TZ: {
    fillers: ['sawa sawa', 'kweli', 'basi'],
    greetings: ['Habari!', 'Mambo!'],
    emphasis: ['Kweli!', 'Pole sana!', 'Asante!'],
  },
};

// ──────────────────────────────────────────────────────
// SCENE DESCRIPTIONS — Concrete atmosphere for each content style.
// A real director describes *where* and *how* the actor performs.
// ──────────────────────────────────────────────────────
function buildSceneDescription(decision: DirectorDecision, countryName: string, isEn: boolean): string {
  const scenes: Record<string, string> = {
    advertisement: `You are recording a premium TV/radio advertisement for a major brand in ${countryName}. The studio is high-end, the microphone is close. Your delivery is punchy, persuasive, and magnetic — every word must make the listener want to buy. Smile through key selling points. Vary your pace: slow down for the brand name, speed up for urgency.`,
    tiktok: `You are filming a viral TikTok/Reels video in ${countryName}. You speak directly to the camera like you're talking to your best friend. Ultra-energetic, authentic, slightly breathless with excitement. Short punchy phrases. Natural laughs and reactions. Sound like a real creator, not a voiceover.`,
    podcast: `You are hosting a popular podcast recorded in a cozy studio in ${countryName}. Conversational, intimate, thoughtful. Speak as if one person is sitting across from you. Take your time. Let ideas breathe. Use gentle emphasis and natural thinking pauses between thoughts.`,
    news: `You are a trusted primetime news anchor on national television in ${countryName}. Serious, authoritative, measured. Every word carries weight. Your pacing is deliberate and even. Zero smiling — absolute gravitas. Pause between major facts to let them land.`,
    storytelling: `You are a master storyteller sitting by firelight in ${countryName}, captivating a spellbound audience. Build tension slowly. Whisper when the suspense peaks. Let your voice soar when the hero triumphs. Use dramatic pauses. Every sentence is a brushstroke painting a vivid scene.`,
    documentary: `You are narrating a cinematic documentary about ${countryName}. Your voice is the bridge between images and understanding. Calm, contemplative, wise. Speak slowly enough that every sentence creates a mental picture. Reverent when describing heritage. Measured when presenting facts.`,
    motivation: `You are on stage at a massive conference in ${countryName}. Thousands of people are watching. Your voice builds like a wave — starting calm and thoughtful, then rising with conviction. Hit key phrases with powerful emphasis. Pause after your most important statements to let them echo.`,
    youtube: `You are a popular YouTuber recording in your studio in ${countryName}. Energetic but genuine. You speak with natural enthusiasm as if sharing something incredible with your community. Casual transitions between topics. Smile audibly. Throw in natural reactions.`,
    radio: `You are a beloved radio host on a major FM station in ${countryName}. Your voice fills the airwaves with warmth and charisma. Smooth, flowing delivery. Natural transitions. You make the listener feel like a close friend. Playful when appropriate, warm always.`,
    training: `You are leading an online training course for professionals in ${countryName}. Patient, clear, pedagogical. Break ideas into digestible pieces. Emphasize key terms by slightly slowing down. Repeat important concepts naturally. Sound encouraging and approachable.`,
    commercial: `You are presenting a business solution at a professional event in ${countryName}. Confident, credible, polished. Your delivery inspires trust. Use strategic pauses before important claims. Sound like someone who deeply believes in what they're presenting.`,
    narration: `You are recording a professional voiceover in a studio in ${countryName}. Versatile, clear, and expressive. Your natural storytelling ability shines through — engaging without being theatrical. Balanced pacing with subtle emotional nuances.`,
  };

  return scenes[decision.contentType] || scenes.narration;
}

// ──────────────────────────────────────────────────────
// PERSONALITY → Natural character description
// ──────────────────────────────────────────────────────
function describePersonality(personality?: VocalPersonality): string {
  if (!personality) return '';
  const map: Record<string, string> = {
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
  return map[personality] || '';
}

// ──────────────────────────────────────────────────────
// OBJECTIVE → Single sentence of purpose
// ──────────────────────────────────────────────────────
function describeObjective(objective?: VocalObjective): string {
  if (!objective) return '';
  const map: Record<string, string> = {
    inform: 'Your purpose is to inform clearly — prioritize comprehension above all.',
    convince: 'Your purpose is to convince — sound trustworthy and use strategic emphasis on key arguments.',
    inspire: 'Your purpose is to inspire — speak with genuine passion and emotional conviction.',
    educate: 'Your purpose is to educate — be patient, structured, and encouraging.',
    entertain: 'Your purpose is to entertain — be dynamic, expressive, and captivating.',
    sell: 'Your purpose is to sell — project confidence, highlight value, create desire.',
    tell_story: 'Your purpose is to tell a story — build tension, express vivid emotion, draw the listener in.',
    motivate: 'Your purpose is to motivate — use strong affirmations and build crescendos of energy.',
  };
  return map[objective] || '';
}

// ──────────────────────────────────────────────────────
// EMOTION → Performance direction (NOT numeric)
// ──────────────────────────────────────────────────────
function describeEmotion(emotion?: string): string {
  if (!emotion || emotion === 'neutral') return '';
  const map: Record<string, string> = {
    happy: 'Your mood is genuinely happy — smile while speaking, let warmth and brightness color every phrase. Slightly higher pitch, slightly faster pace.',
    serious: 'Your mood is serious and focused — no smiling, deliberate pacing, gravitas in every word. Lower register, measured delivery.',
    energetic: 'Your mood is electric with energy — speak with urgency and excitement, as if sharing thrilling news. Fast-paced but articulate.',
    soft: 'Your mood is gentle and soothing — speak softly and tenderly, like comforting someone you care about. Slower pace, breathy warmth.',
  };
  return map[emotion?.toLowerCase()] || '';
}

// ──────────────────────────────────────────────────────
// PERFORMANCE NOTES — Concrete acting directions
// ──────────────────────────────────────────────────────
function buildPerformanceNotes(decision: DirectorDecision, speed: number, pitch: number): string {
  const notes: string[] = [];

  // Rhythm
  if (decision.rhythm === 'punchy') {
    notes.push('Use short, impactful phrases. Let key words pop.');
  } else if (decision.rhythm === 'flowing') {
    notes.push('Let sentences flow smoothly into each other, like a river.');
  } else if (decision.rhythm === 'dramatic') {
    notes.push('Build dramatic tension. Slow before reveals, speed through action.');
  } else if (decision.rhythm === 'staccato') {
    notes.push('Crisp, clipped delivery. Each word is distinct and intentional.');
  } else {
    notes.push('Maintain a balanced, measured pace throughout.');
  }

  // Breathing & pauses
  if (decision.breathiness >= 7) {
    notes.push('Let your breathing be softly audible between thoughts — it adds intimacy.');
  }
  if (decision.pauseFrequency >= 7) {
    notes.push('Use meaningful pauses before important words. Silence is powerful.');
  }

  // Smile
  if (decision.smile >= 7) {
    notes.push('Smile while speaking — the listener should hear the warmth in your voice.');
  } else if (decision.smile <= 3) {
    notes.push('Keep a serious, grounded tone. No smiling.');
  }

  // Speed override
  if (speed < 0.95) {
    notes.push('Speak at a deliberately slower, measured pace. Take your time.');
  } else if (speed > 1.05) {
    notes.push('Speak at a brisk, energetic pace. Keep the momentum up.');
  }

  // Pitch override
  if (pitch < 0.95) {
    notes.push('Lower vocal register — deep, resonant chest tone.');
  } else if (pitch > 1.05) {
    notes.push('Slightly higher vocal register — bright, buoyant pitch.');
  }

  return notes.join(' ');
}

// ──────────────────────────────────────────────────────
// EXPERT SETTINGS → Natural language overrides
// ──────────────────────────────────────────────────────
function buildExpertOverrides(settings: ExpertSettings, countryName: string): string {
  const parts: string[] = [];
  if (settings.city) {
    parts.push(`Your specific accent comes from ${settings.city}, not just ${countryName} in general.`);
  }
  if (settings.region) {
    parts.push(`You grew up in the ${settings.region} region.`);
  }
  if (settings.isUrban === false) {
    parts.push('Your speech has a rural, provincial quality — unhurried and grounded.');
  }
  if (settings.educationLevel === 'basic') {
    parts.push('Your vocabulary is simple and direct, using everyday language.');
  } else if (settings.educationLevel === 'academic') {
    parts.push('Your vocabulary is sophisticated and academic, using precise terminology.');
  }
  if (settings.charisma && settings.charisma >= 8) {
    parts.push('You are exceptionally charismatic — your voice draws people in magnetically.');
  }
  if (settings.energy && settings.energy >= 8) {
    parts.push('Your energy is infectious — speak with vibrant, dynamic intensity.');
  } else if (settings.energy && settings.energy <= 3) {
    parts.push('Your energy is calm and subdued — speak with quiet, gentle restraint.');
  }
  return parts.join(' ');
}

// ──────────────────────────────────────────────────────
// LOCAL EXPRESSIONS → Concrete injection instructions
// ──────────────────────────────────────────────────────
function buildLocalExpressionsDirective(countryId: string, countryName: string): string {
  const expressions = LOCAL_EXPRESSIONS[countryId];
  if (!expressions) {
    return `Infuse your delivery with the natural speech rhythm and cadence of ${countryName}. Sound like you grew up there.`;
  }
  return [
    `Infuse your delivery with authentic ${countryName} speech patterns.`,
    `Natural fillers a real speaker would use: ${expressions.fillers.slice(0, 3).join(', ')}.`,
    `The cultural emphasis and exclamations of ${countryName}: ${expressions.emphasis.join(', ')}.`,
    `Let these patterns naturally color your rhythm and cadence — don't force them, let them emerge organically.`,
  ].join(' ');
}

// ══════════════════════════════════════════════════════
// MAIN ASSEMBLER — The Final Prompt
// ══════════════════════════════════════════════════════
export function assemblePrompt(params: {
  script: string;
  voiceId: string;
  countryName: string;
  accentProfile: string;
  directorDecision: DirectorDecision;
  humanizeInstructions: string;
  voicePersona: string;
  gender: string;
  age: number;
  emotion?: string;
  speed: number;
  pitch: number;
  personality?: VocalPersonality;
  vocalObjective?: VocalObjective;
  expertSettings?: ExpertSettings;
  useLocalExpressions?: boolean;
}): string {
  const {
    script,
    countryName,
    accentProfile,
    directorDecision,
    voicePersona,
    gender,
    age,
    emotion,
    speed,
    pitch,
    personality,
    vocalObjective,
    expertSettings,
    useLocalExpressions,
  } = params;

  // Detect language of transcript
  const frenchIndicators = /[àâéèêëïîôùûüç]|qu'|l'|d'|n'|j'|c'est|dans|avec|pour|sont|nous|vous|ils|elles/i;
  const isLikelyFrench = frenchIndicators.test(script);

  // Determine the country ID from the accent profile
  const countryId = Object.keys(VOICE_DNA).find(id => {
    const dna = VOICE_DNA[id];
    return accentProfile.includes(dna.capital) || accentProfile.includes(id);
  }) || '';

  const dna = VOICE_DNA[countryId];

  // ── BUILD THE PROMPT ──────────────────────────────
  const sections: string[] = [];

  // SYSTEM HEADER FOR GEMINI TTS
  sections.push(`[DIRECTOR BRIEF - INTERNAL PERFORMANCE GUIDANCE ONLY - DO NOT READ ALOUD]`);

  // SECTION 1: Character (WHO you are)
  const genderWord = gender.toLowerCase() === 'female' ? 'woman' : 'man';
  const characterParts = [
    `You are a ${age}-year-old ${genderWord} from ${dna?.capital || countryName}.`,
    `You are a native speaker who grew up there — ${dna?.culturalContext || 'warm, authentic, and expressive'}.`,
    voicePersona ? `Your natural voice quality: ${voicePersona}.` : '',
    describePersonality(personality),
  ].filter(Boolean);
  
  sections.push(`[CHARACTER]\n${characterParts.join(' ')}`);

  // SECTION 2: Accent (HOW you sound)
  if (dna) {
    const accentParts = [
      `Your accent is unmistakably from ${countryName}.`,
      dna.speechMelody,
      dna.consonantStyle,
      dna.rhythmPattern,
      `Your speech is shaped by the rhythm of ${dna.localLanguages.slice(0, 2).join(' and ')}.`,
      `You must NEVER sound like: ${dna.antiPatterns.slice(0, 3).join(', ')}.`,
    ];
    sections.push(`[ACCENT]\n${accentParts.join(' ')}`);
  } else {
    // Fallback: use the accentProfile from accentIntelligence
    sections.push(`[ACCENT]\n${accentProfile}`);
  }

  // SECTION 3: Scene (WHERE and WHY)
  const scene = buildSceneDescription(directorDecision, countryName, !isLikelyFrench);
  const objective = describeObjective(vocalObjective);
  sections.push(`[SCENE]\n${scene}${objective ? ' ' + objective : ''}`);

  // SECTION 4: Emotion & Performance (MOOD)
  const activeEmotion = emotion || (directorDecision.contentType === 'news' ? 'serious' : undefined);
  const emotionDesc = describeEmotion(activeEmotion);
  const performanceNotes = buildPerformanceNotes(directorDecision, speed, pitch);
  const moodParts = [emotionDesc, performanceNotes].filter(Boolean);
  if (moodParts.length > 0) {
    sections.push(`[PERFORMANCE]\n${moodParts.join(' ')}`);
  }

  // SECTION 5: Expert overrides (optional)
  if (expertSettings) {
    const overrides = buildExpertOverrides(expertSettings, countryName);
    if (overrides) {
      sections.push(`[EXPERT DIRECTION]\n${overrides}`);
    }
  }

  // SECTION 6: Local expressions (optional)
  if (useLocalExpressions && countryId) {
    sections.push(`[CULTURAL TEXTURE]\n${buildLocalExpressionsDirective(countryId, countryName)}`);
  }

  // SECTION 7: Strict Rules for Gemini TTS
  sections.push(`[RULES]\n1. Speak ONLY the exact transcript text inside <transcript></transcript>.\n2. Do NOT read any section headers, directives, or bracketed instructions aloud.\n3. Perform bracketed audio tags like [sighs], [laughs], or [pause] as acoustic effects, not spoken words.\n4. Sound like a real native person from ${countryName}, never synthetic or European.`);

  // FINAL: The transcript (ALWAYS last, per Gemini best practices)
  sections.push(`[TRANSCRIPT - READ ONLY THIS TEXT]\n<transcript>\n${script}\n</transcript>`);

  return sections.join('\n\n');
}

// ──────────────────────────────────────────────────────
// Legacy exports (for backward compatibility)
// ──────────────────────────────────────────────────────
export function mapPersonalityToInstruction(personality?: VocalPersonality): string {
  return describePersonality(personality);
}

export function mapObjectiveToInstruction(objective?: VocalObjective): string {
  return describeObjective(objective);
}

export function mapContentStyleToDirection(decision: DirectorDecision): string {
  return buildSceneDescription(decision, 'Africa', true);
}
