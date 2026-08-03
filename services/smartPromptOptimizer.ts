import type {
  DirectorDecision,
  VocalPersonality,
  VocalObjective,
  ExpertSettings,
} from '../types';

/**
 * Maps a VocalPersonality to a behavioral instruction for the voice actor.
 */
export function mapPersonalityToInstruction(personality?: VocalPersonality): string {
  if (!personality) return '';

  const map: Record<VocalPersonality, string> = {
    entrepreneur: 'Speak like a confident entrepreneur presenting a business idea. Assertive, visionary, and compelling.',
    professor: 'Speak like a university professor lecturing. Articulate, patient, pedagogical, and slightly formal.',
    student: 'Speak like a young, enthusiastic student. Fresh, curious, slightly informal, and relatable.',
    journalist: 'Speak like a professional news anchor. Objective, precise, measured, with gravitas.',
    narrator: 'Speak like a seasoned documentary narrator. Rich, atmospheric, drawing the listener into the story.',
    salesperson: 'Speak like a top salesperson. Persuasive, warm, trustworthy, with strategic pauses for impact.',
    tiktok_creator: 'Speak like a viral TikTok creator. Ultra-energetic, punchy, modern slang, rapid-fire delivery.',
    influencer: 'Speak like a social media influencer. Relatable, charismatic, trendy, with a smile in the voice.',
    ceo: 'Speak like a Fortune 500 CEO giving a keynote. Commanding, visionary, authoritative, yet approachable.',
    coach: 'Speak like a motivational coach. Empowering, encouraging, passionate, with rising intonation on key points.',
    radio_host: 'Speak like a popular radio DJ. Smooth, charismatic, great pacing, with natural transitions and energy.',
  };

  return map[personality] || `Adopt a ${personality} personality.`;
}

/**
 * Maps a VocalObjective to a goal instruction for the voice actor.
 */
export function mapObjectiveToInstruction(objective?: VocalObjective): string {
  if (!objective) return '';

  const map: Record<VocalObjective, string> = {
    inform: 'Your goal is to clearly and objectively convey information. Prioritize clarity and comprehension.',
    convince: 'Your goal is to persuade the listener. Sound convincing, trustworthy, and use strategic emphasis.',
    inspire: 'Your goal is to inspire and uplift. Speak with passion, conviction, and emotional depth.',
    educate: 'Your goal is to educate. Break down complex ideas patiently, with clear structure and examples.',
    entertain: 'Your goal is to entertain. Be engaging, expressive, dynamic, and captivating.',
    sell: 'Your goal is to sell. Project confidence, highlight value propositions, and create urgency.',
    tell_story: 'Your goal is to tell a story. Draw the listener in, build narrative tension, and express vivid emotion.',
    motivate: 'Your goal is to motivate. Be empowering, use strong affirmations, and build crescendos of energy.',
  };

  return map[objective] || `Your primary goal is to ${objective}.`;
}

/**
 * Maps a DirectorDecision to scene direction paragraphs.
 */
export function mapContentStyleToDirection(decision: DirectorDecision): string {
  const directions: string[] = [];

  if (decision.contentType) {
    directions.push(`Content Style: The delivery should suit a ${decision.contentType} format.`);
  }

  directions.push(`Energy Level: ${decision.energy}/10`);
  directions.push(`Smile Level: ${decision.smile}/10`);
  directions.push(`Rhythm/Pacing: ${decision.rhythm}`);
  directions.push(`Intonation Profile: ${decision.intonation}`);
  directions.push(`Confidence Level: ${decision.confidence}/10`);

  return directions.join('\n');
}

/**
 * Assembles all engine outputs into a single, professional Gemini TTS prompt.
 * This is the final prompt that gets sent to the Gemini API.
 */
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
  speed: number;
  pitch: number;
  personality?: VocalPersonality;
  vocalObjective?: VocalObjective;
  expertSettings?: ExpertSettings;
}): string {
  const {
    script,
    countryName,
    accentProfile,
    directorDecision,
    humanizeInstructions,
    voicePersona,
    age,
    speed,
    pitch,
    personality,
    vocalObjective,
    expertSettings,
  } = params;

  let prompt = `[VOICE DIRECTOR BRIEF - INTERNAL PERFORMANCE DIRECTIVES]
You are a master voice director guiding a native voice actor for audio synthesis.
Perform the speech strictly according to the acoustic and artistic directives below.
Do NOT read any directives aloud. Perform ONLY the text enclosed within <transcript></transcript>.

${accentProfile}

=== VOICE PERSONA ===
${voicePersona}
${mapPersonalityToInstruction(personality)}

=== SCENE DIRECTION & FORMAT ===
${mapContentStyleToDirection(directorDecision)}

=== VOCAL PERFORMANCE OBJECTIVE ===
${mapObjectiveToInstruction(vocalObjective)}

${humanizeInstructions}

=== PITCH, SPEED & AGE REGULATION ===
- Speaking Tempo: ${speed < 1.0 ? 'Paced, deliberate, and measured. Take time between key phrases.' : speed > 1.0 ? 'Brisk, energetic, and rapid-fire. Deliver with urgency.' : 'Natural, conversational, balanced tempo.'} (Speed multiplier: ${speed})
- Pitch Modulation: ${pitch < 1.0 ? 'Deep, resonant, low-pitched vocal tone carrying weight.' : pitch > 1.0 ? 'Bright, crisp, higher-pitched tone filled with levity.' : 'Balanced, natural pitch register.'} (Pitch multiplier: ${pitch})
- Age Register: Vocal texture must sound like a native speaker aged ${age} years old.

=== ANTI-GENERIC ACCENT GUARANTEE ===
CRITICAL DIRECTIVE: The voice MUST sound like a real, living, authentic person from ${countryName}.
NEVER sound generic, robotic, or like synthetic computer-generated TTS.
NEVER substitute European French (Parisian), Standard American English, or British RP accents.`;

  if (expertSettings) {
    prompt += `\n\n=== EXPERT REGIONAL & ACOUSTIC OVERRIDES ===\n`;
    if (expertSettings.city) prompt += `- City Accent Focus: ${expertSettings.city}\n`;
    if (expertSettings.region) prompt += `- Region Focus: ${expertSettings.region}\n`;
    if (expertSettings.isUrban !== undefined) prompt += `- Setting Cadence: ${expertSettings.isUrban ? 'Metropolitan Urban' : 'Provincial Rural'}\n`;
    if (expertSettings.educationLevel) prompt += `- Linguistic Style: ${expertSettings.educationLevel}\n`;
    if (expertSettings.profession) prompt += `- Profession Context: ${expertSettings.profession}\n`;
    if (expertSettings.socialClass) prompt += `- Social Cadence: ${expertSettings.socialClass}\n`;
    if (expertSettings.energy) prompt += `- Energy Intensity: ${expertSettings.energy}/10\n`;
    if (expertSettings.expressiveness) prompt += `- Expressiveness: ${expertSettings.expressiveness}/10\n`;
    if (expertSettings.smile) prompt += `- Formant Warmth/Smile: ${expertSettings.smile}/10\n`;
    if (expertSettings.breathing) prompt += `- Breath Prominence: ${expertSettings.breathing}/10\n`;
    if (expertSettings.presence) prompt += `- Vocal Presence: ${expertSettings.presence}/10\n`;
    if (expertSettings.charisma) prompt += `- Charisma Level: ${expertSettings.charisma}/10\n`;
  }

  prompt += `\n\nCRITICAL: Read ONLY the exact transcript text inside <transcript></transcript> below. Do NOT speak any instructions.\n\n<transcript>\n${script}\n</transcript>`;

  return prompt;
}

