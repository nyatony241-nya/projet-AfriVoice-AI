import { AccentLevel } from '../types';
import { VOICE_DNA } from './voiceDNA';

/**
 * Accent Intelligence Engine v3
 * 
 * Builds a concise, narrative description of the target accent.
 * The output is injected into the [ACCENT] section of the director prompt.
 * 
 * Design philosophy:
 * - Accent descriptions read like a casting director's note
 * - No numeric scores or technical TTS jargon
 * - Anti-patterns are included to prevent accent drift
 * - Accent intensity controls how prominently the accent features
 */
export function buildAccentProfile(
  countryId: string, 
  accentLevel: AccentLevel, 
  gender: string, 
  age: number
): string {
  const dna = VOICE_DNA[countryId];
  
  if (!dna) {
    // Generic African accent fallback
    return [
      `You are a ${age}-year-old native African speaker.`,
      `Your accent is warm, melodic, and authentically Sub-Saharan.`,
      `Never substitute with European, American, or British accents.`,
    ].join(' ');
  }

  // Intensity descriptions — how strongly the accent should feature
  const intensityDescriptions: Record<AccentLevel, string> = {
    light: [
      `You have a professional, polished speaking voice with subtle traces of your ${dna.capital} upbringing.`,
      `Your accent is there — in the occasional rhythm, in how you stress certain syllables — but it's understated and elegant.`,
      `You sound like a ${dna.capital} native who has traveled widely but never lost their roots.`,
    ].join(' '),
    
    medium: [
      `You have a clear, unmistakable accent from ${dna.capital}.`,
      `Anyone from ${dna.region} would immediately recognize where you're from.`,
      `You speak with natural confidence — this is simply how you talk.`,
    ].join(' '),
    
    strong: [
      `You have a rich, thick, unapologetic accent from ${dna.capital}.`,
      `Every syllable is deeply rooted in local speech patterns.`,
      `You sound like someone who has never left their neighborhood — the accent is in your bones.`,
      `The local rhythm of ${dna.localLanguages[0]} colors every word.`,
    ].join(' '),
  };

  return intensityDescriptions[accentLevel] || intensityDescriptions.medium;
}
