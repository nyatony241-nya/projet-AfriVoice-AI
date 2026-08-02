import { VoiceDNA, AccentLevel } from '../types';
import { VOICE_DNA } from './voiceDNA';

/**
 * Builds a rich English paragraph that describes the target accent,
 * formatted to be injected into the Gemini TTS prompt.
 *
 * @param countryId The 2-letter country code
 * @param accentLevel The desired strength of the accent
 * @param gender The gender of the speaker
 * @param age The age of the speaker
 * @returns A detailed string for the prompt
 */
export function buildAccentProfile(countryId: string, accentLevel: AccentLevel, gender: string, age: number): string {
  const dna = VOICE_DNA[countryId];
  if (!dna) {
    throw new Error(`Voice DNA not found for country: ${countryId}`);
  }

  let intensityDescription = '';
  switch (accentLevel) {
    case 'light':
      intensityDescription = `Slight hints of ${dna.countryId} accent, mostly neutral but with occasional local rhythm`;
      break;
    case 'medium':
      intensityDescription = `Clear and unmistakable ${dna.countryId} accent. Native speaker who grew up in ${dna.capital}.`;
      break;
    case 'strong':
      intensityDescription = `Extremely thick, heavy, unapologetic ${dna.countryId} accent. Deep cultural roots. Every syllable drips with local identity.`;
      break;
    default:
      intensityDescription = `Clear and unmistakable ${dna.countryId} accent.`;
  }

  const profileParts = [
    `=== CHARACTER IDENTITY ===`,
    `You are a ${age}-year-old ${gender} from ${dna.capital}, ${dna.countryId} (${dna.region}).`,
    `INTENSITY: ${intensityDescription}`,
    `SPEECH MELODY: ${dna.speechMelody}`,
    `CONSONANT STYLE: ${dna.consonantStyle}`,
    `RHYTHM PATTERN: ${dna.rhythmPattern}`,
    `CULTURAL CONTEXT: ${dna.culturalContext}`,
    `You speak with the soul of a native whose local languages include ${dna.localLanguages.join(', ')}.`,
    `CRITICAL ANTI-PATTERNS (DO NOT SOUND LIKE THESE): ${dna.antiPatterns.join(', ')}.`
  ];

  return profileParts.join('\n');
}
