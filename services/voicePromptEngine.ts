import { analyzeScript } from './aiVoiceDirector';
import { buildAccentProfile } from './accentIntelligence';
import { assemblePrompt } from './smartPromptOptimizer';
import type { 
  AccentLevel, 
  ContentStyle, 
  VocalPersonality, 
  VocalObjective, 
  ExpertSettings,
  DirectorDecision
} from '../types';

/**
 * VoicePromptEngine v3 — AI Voice Director
 * 
 * Architecture:
 * 1. Voice Variant → selects the right Gemini voice (Aoede, Puck, etc.)
 * 2. AI Director → analyzes script content & determines delivery style
 * 3. Emotion Layer → modulates the director's decision based on user emotion
 * 4. Prompt Assembly → builds a concise, narrative-driven prompt
 * 
 * Design principles:
 * - Prompts read like a director's brief, not a config file
 * - No numeric scores — Gemini TTS interprets narrative descriptions
 * - Transcript is ALWAYS placed last (Gemini best practice)
 * - Total prompt kept under ~600 words to avoid quality drift
 */
export function buildOptimizedPrompt(params: {
  script: string;
  voiceId: string;
  countryId: string;
  countryName: string;
  gender: string;
  voiceVariant?: string;
  isClonedVoice?: boolean;
  age: number;
  emotion?: string;
  speed: number;
  pitch: number;
  accentLevel?: AccentLevel;
  contentStyle?: ContentStyle;
  personality?: VocalPersonality;
  vocalObjective?: VocalObjective;
  expertMode?: boolean;
  expertSettings?: ExpertSettings;
  useLocalExpressions?: boolean;
}): { prompt: string; actualVoiceId: string } {
  
  // ── STEP 1: Voice Variant Mapping ──────────────────
  // Map user selection to Gemini voice names and persona descriptions
  let actualVoiceId = params.voiceId;
  let voicePersona = '';

  if (!params.isClonedVoice) {
    const VOICE_VARIANTS: Record<string, { id: string; persona: string }> = {
      'female-voice1': { id: 'Aoede', persona: 'soft, warm, and elegant' },
      'female-voice2': { id: 'Kore', persona: 'bright, dynamic, and youthful' },
      'female-voice3': { id: 'Leda', persona: 'mature, authoritative, and wise' },
      'male-voice1':   { id: 'Puck', persona: 'deep, resonant, and commanding' },
      'male-voice2':   { id: 'Charon', persona: 'warm, reassuring, and conversational' },
      'male-voice3':   { id: 'Fenrir', persona: 'energetic, sharp, and fast-paced' },
    };

    const key = `${params.gender.toLowerCase()}-${params.voiceVariant || 'voice1'}`;
    const variant = VOICE_VARIANTS[key];
    
    if (variant) {
      actualVoiceId = variant.id;
      voicePersona = variant.persona;
    } else {
      // Sensible fallback
      const fallback = params.gender.toLowerCase() === 'female' 
        ? VOICE_VARIANTS['female-voice1'] 
        : VOICE_VARIANTS['male-voice1'];
      actualVoiceId = fallback.id;
      voicePersona = fallback.persona;
    }
  }

  // ── STEP 2: AI Voice Director ─────────────────────
  // Analyzes the script text to determine optimal delivery parameters
  const directorDecision: DirectorDecision = analyzeScript(
    params.script, 
    params.contentStyle
  );
  
  // ── STEP 3: Emotion Modulation ────────────────────
  // User-selected emotion overrides specific director parameters.
  // These adjustments are subtle — they nudge the direction rather than 
  // overriding it completely, so the content style still makes sense.
  if (params.emotion) {
    const emotion = params.emotion.toLowerCase();
    
    switch (emotion) {
      case 'happy':
        directorDecision.smile = Math.max(directorDecision.smile, 7);
        directorDecision.energy = Math.max(directorDecision.energy, 6);
        break;
      case 'serious':
        directorDecision.smile = Math.min(directorDecision.smile, 3);
        directorDecision.breathiness = Math.max(directorDecision.breathiness, 5);
        break;
      case 'energetic':
        directorDecision.energy = Math.max(directorDecision.energy, 8);
        directorDecision.smile = Math.max(directorDecision.smile, 5);
        directorDecision.rhythm = 'punchy';
        break;
      case 'soft':
        directorDecision.energy = Math.min(directorDecision.energy, 4);
        directorDecision.breathiness = Math.max(directorDecision.breathiness, 7);
        directorDecision.rhythm = 'flowing';
        break;
    }
  }

  // ── STEP 4: Accent Profile ────────────────────────
  // Builds a rich description of the target accent from VoiceDNA
  const accentProfile = buildAccentProfile(
    params.countryId,
    params.accentLevel || 'medium',
    params.gender,
    params.age
  );

  // ── STEP 5: Assemble Final Prompt ─────────────────
  // The SmartPromptOptimizer v3 builds a narrative prompt that reads 
  // like a director's brief. It incorporates the accent profile, 
  // scene description, performance notes, and cultural texture
  // into a cohesive whole — no more separate "HUMANIZER" section.
  const prompt = assemblePrompt({
    script: params.script,
    voiceId: actualVoiceId,
    countryName: params.countryName,
    accentProfile,
    directorDecision,
    humanizeInstructions: '', // v3: humanization is integrated into the scene/performance
    voicePersona,
    gender: params.gender,
    age: params.age,
    emotion: params.emotion,
    speed: params.speed,
    pitch: params.pitch,
    personality: params.personality,
    vocalObjective: params.vocalObjective,
    expertSettings: params.expertMode ? params.expertSettings : undefined,
    useLocalExpressions: params.useLocalExpressions,
  });

  return { prompt, actualVoiceId };
}
