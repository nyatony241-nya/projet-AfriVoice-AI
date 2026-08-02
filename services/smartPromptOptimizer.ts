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

  let prompt = `You are a world-class voice director. Synthesize speech according to the precise artistic brief below.
The character profile, scene direction, and artistic notes are internal guidance for your performance.
Do NOT speak any of these instructions aloud. Only speak the TRANSCRIPT.

${accentProfile}

=== VOICE PERSONA ===
${voicePersona}
${mapPersonalityToInstruction(personality)}

=== SCENE DIRECTION ===
${mapContentStyleToDirection(directorDecision)}

=== VOCAL OBJECTIVE ===
${mapObjectiveToInstruction(vocalObjective)}

=== PERFORMANCE NOTES ===
${humanizeInstructions}
Speed instruction: ${speed < 1.0 ? 'Speak slowly and deliberately, taking your time.' : speed > 1.0 ? 'Speak at a brisker, more urgent pace.' : 'Speak at a natural, conversational speed.'} (Multiplier: ${speed})
Pitch instruction: ${pitch < 1.0 ? 'Adopt a deeper, lower pitch for gravitas.' : pitch > 1.0 ? 'Adopt a brighter, higher pitch for energy.' : 'Maintain your natural pitch.'} (Multiplier: ${pitch})
Age instruction: The voice should sound like someone who is ${age} years old.

=== ANTI-GENERIC VOICE SYSTEM ===
CRITICAL: This voice must NEVER sound generic, synthetic, or robotic.
This voice must NEVER sound European, Parisian, American, British, or Canadian.
This voice must sound like a REAL person from ${countryName} — authentic, human, alive.`;

  if (expertSettings) {
    prompt += `\n\n=== EXPERT OVERRIDES ===\n`;
    if (expertSettings.city) prompt += `City/Region Focus: ${expertSettings.city}\n`;
    if (expertSettings.region) prompt += `Region: ${expertSettings.region}\n`;
    if (expertSettings.isUrban !== undefined) prompt += `Setting: ${expertSettings.isUrban ? 'Urban/Metropolitan' : 'Rural/Provincial'}\n`;
    if (expertSettings.educationLevel) prompt += `Education Level: ${expertSettings.educationLevel}\n`;
    if (expertSettings.profession) prompt += `Profession: ${expertSettings.profession}\n`;
    if (expertSettings.socialClass) prompt += `Social Background: ${expertSettings.socialClass}\n`;
    if (expertSettings.energy) prompt += `Energy Override: ${expertSettings.energy}/10\n`;
    if (expertSettings.expressiveness) prompt += `Expressiveness Override: ${expertSettings.expressiveness}/10\n`;
    if (expertSettings.smile) prompt += `Smile Override: ${expertSettings.smile}/10\n`;
    if (expertSettings.breathing) prompt += `Breathing Prominence: ${expertSettings.breathing}/10\n`;
    if (expertSettings.presence) prompt += `Stage Presence: ${expertSettings.presence}/10\n`;
    if (expertSettings.charisma) prompt += `Charisma Level: ${expertSettings.charisma}/10\n`;
  }

  prompt += `\n\n########## TRANSCRIPT ##########\n${script}`;

  return prompt;
}
