import type { 
  AccentLevel, 
  ContentStyle, 
  VocalPersonality, 
  VocalObjective 
} from '../types';
// @ts-ignore
import { buildDirectorPrompt } from './promptBuilder.js';

export function buildOptimizedPrompt(params: {
  script: string;
  voiceId: string;
  countryId: string;
  countryName: string;
  gender: string;
  voiceVariant?: string;
  age: number;
  emotion?: string;
  speed: number;
  pitch: number;
  accentLevel?: AccentLevel;
  contentStyle?: ContentStyle;
  personality?: VocalPersonality;
  vocalObjective?: VocalObjective;
  useLocalExpressions?: boolean;
  phoneticScript?: string;
}): { prompt: string; actualVoiceId: string } {
  const result = buildDirectorPrompt({
    script: params.script,
    voiceId: params.voiceId,
    countryId: params.countryId,
    countryName: params.countryName,
    gender: params.gender,
    voiceVariant: params.voiceVariant,
    age: params.age,
    accentLevel: params.accentLevel,
    useLocalExpressions: params.useLocalExpressions,
    emotion: params.emotion,
    contentStyle: params.contentStyle,
    personality: params.personality,
    vocalObjective: params.vocalObjective,
    speed: params.speed,
    pitch: params.pitch,
    phoneticScript: params.phoneticScript,
  });

  return {
    prompt: result.directorBrief,
    actualVoiceId: result.actualVoiceId
  };
}
