import { analyzeScript } from './aiVoiceDirector';
import { buildAccentProfile } from './accentIntelligence';
import { generateHumanizeInstructions } from './humanizerAI';
import { assemblePrompt } from './smartPromptOptimizer';
import type { 
  AccentLevel, 
  ContentStyle, 
  VocalPersonality, 
  VocalObjective, 
  ExpertSettings,
  DirectorDecision
} from '../types';

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
  
  // 1. Voice Variant Mapping
  let actualVoiceId = params.voiceId;
  let voicePersona = 'A natural and expressive voice.';

  if (!params.isClonedVoice) {
    const variantMap: Record<string, { id: string; persona: string }> = {
      'female-voice1': { id: 'Aoede', persona: 'Soft, calm, elegant narrator' },
      'female-voice2': { id: 'Kore', persona: 'Dynamic, energetic, bright' },
      'female-voice3': { id: 'Aoede', persona: 'Mature, authoritative, wise' },
      'male-voice1': { id: 'Puck', persona: 'Deep, resonant, imposing' },
      'male-voice2': { id: 'Charon', persona: 'Warm, friendly, reassuring' },
      'male-voice3': { id: 'Fenrir', persona: 'Energetic, fast-paced, punchy' },
    };

    const key = `${params.gender.toLowerCase()}-${params.voiceVariant || 'voice1'}`;
    if (variantMap[key]) {
      actualVoiceId = variantMap[key].id;
      voicePersona = variantMap[key].persona;
    } else {
      // fallback mapping if format doesn't match perfectly
      if (params.gender.toLowerCase() === 'female') {
        actualVoiceId = 'Aoede';
        voicePersona = 'Soft, calm, elegant narrator';
      } else {
        actualVoiceId = 'Puck';
        voicePersona = 'Deep, resonant, imposing';
      }
    }
  }

  // 2. AI Voice Director
  const directorDecision: DirectorDecision = analyzeScript(params.script, params.contentStyle);
  
  if (params.emotion) {
    const emotionLower = params.emotion.toLowerCase();
    
    if (emotionLower === 'happy') {
      directorDecision.smile = 8;
      directorDecision.energy = 7;
    } else if (emotionLower === 'serious') {
      directorDecision.smile = 2;
      directorDecision.energy = 5;
    } else if (emotionLower === 'energetic') {
      directorDecision.energy = 9;
      directorDecision.smile = 6;
    } else if (emotionLower === 'soft') {
      directorDecision.energy = 3;
      directorDecision.breathiness = 7;
    }
  }

  // 3. Accent Intelligence
  const accentProfile = buildAccentProfile(
    params.countryId,
    params.accentLevel || 'medium',
    params.gender,
    params.age
  );

  // 4. Humanizer AI
  const humanizeInstructions = generateHumanizeInstructions(
    directorDecision,
    params.age,
    params.gender
  );

  // 5. Smart Prompt Optimizer
  const prompt = assemblePrompt({
    script: params.script,
    voiceId: actualVoiceId,
    countryName: params.countryName,
    accentProfile,
    directorDecision,
    humanizeInstructions,
    voicePersona,
    gender: params.gender,
    age: params.age,
    speed: params.speed,
    pitch: params.pitch,
    personality: params.personality,
    vocalObjective: params.vocalObjective,
    expertSettings: params.expertMode ? params.expertSettings : undefined,
  });

  return { prompt, actualVoiceId };
}
