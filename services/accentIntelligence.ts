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
    console.warn(`[AccentIntelligence] Voice DNA not found for country: "${countryId}". Using generic African profile.`);
    return [
      `=== VOICE ACTOR ROLE & ACCENT IDENTITY ===`,
      `ROLE: Master native voice actor (${age}-year-old ${gender}) from Sub-Saharan Africa.`,
      `ACCENT PROFILE: Authentic Sub-Saharan African accent. Warm, resonant, and natural.`,
      `SPEECH MELODY: Rich, melodic, and expressive cadence with natural African pitch contours.`,
      `CONSONANT ARTICULATION: Crisp, clear, and un-slurred articulation.`,
      `CADENCE & RHYTHM: Syllable-timed, rhythmic, and engaging flow with organic micro-pauses.`,
      `CULTURAL RESONANCE: Deeply authentic, warm, and confident native expression.`,
      `STRICT ANTI-PATTERNS: Absolutely NEVER use European French (Parisian), American English, or British RP accents.`
    ].join('\n');
  }

  let intensityDescription = '';
  switch (accentLevel) {
    case 'light':
      intensityDescription = `Subtle, elegant hints of ${dna.countryId} accent. Professional neutral baseline infused with genuine ${dna.capital} vocal rhythm.`;
      break;
    case 'medium':
      intensityDescription = `Unmistakable, 100% authentic ${dna.countryId} accent. Speak as a born-and-raised native of ${dna.capital}.`;
      break;
    case 'strong':
      intensityDescription = `Rich, deep, unapologetic ${dna.countryId} accent. Every sentence is saturated with authentic ${dna.capital} vocal identity, local cadence, and cultural warmth.`;
      break;
    default:
      intensityDescription = `Clear and 100% authentic ${dna.countryId} accent.`;
  }

  const profileParts = [
    `=== VOICE ACTOR ROLE & ACCENT IDENTITY ===`,
    `ROLE: You are performing as a master native voice actor (${age}-year-old ${gender}) from ${dna.capital}, ${dna.countryId} (${dna.region}).`,
    `ACCENT INTENSITY: ${intensityDescription}`,
    `SPEECH MELODY: ${dna.speechMelody}`,
    `CONSONANT ARTICULATION: ${dna.consonantStyle}`,
    `RHYTHM & CADENCE: ${dna.rhythmPattern}`,
    `CULTURAL IDENTITY: ${dna.culturalContext}`,
    `NATIVE LINGUISTIC ROOTS: Formed by the speech habits of ${dna.localLanguages.join(', ')}.`,
    `STRICT ANTI-PATTERNS (MUST NEVER SOUND LIKE): ${dna.antiPatterns.join(', ')}.`
  ];

  return profileParts.join('\n');
}

