import { DirectorDecision } from '../types';

/**
 * Generates natural English instructions for the Gemini TTS to humanize the voice performance.
 * 
 * @param decision The previously determined director decision settings.
 * @param age The target age for the voice.
 * @param gender The target gender for the voice.
 * @returns A detailed English prompt for the TTS engine.
 */
export function generateHumanizeInstructions(decision: DirectorDecision, age: number, gender: string): string {
  const breathInstruction = decision.breathiness >= 6 
    ? "Include prominent, natural breathing between sentences." 
    : "Keep breaths subtle and natural.";
    
  const pauseInstruction = decision.pauseFrequency >= 6
    ? "Insert frequent, deliberate micro-pauses before important words for emphasis."
    : "Maintain a steady flow with occasional, natural micro-pauses.";
    
  const smileInstruction = decision.smile >= 6
    ? "Maintain an audible, warm smile throughout the delivery."
    : "Keep the tone mostly neutral, allowing a slight smile only where contextually appropriate.";

  return `Generate a highly natural, human-like voice performance adhering to the following directives:
- Voice Profile: A ${age}-year-old ${gender}. Ensure the vocal texture is age-appropriate and the resonance matches the specified gender perfectly.
- Emotional Authenticity: Deliver the lines with genuine emotional depth. Slight pitch variations are essential; never sound monotone.
- Rhythm and Pacing: Employ a ${decision.rhythm} rhythm. Avoid robotic cadence.
- Intonation: Use a ${decision.intonation} intonation pattern.
- Breathing: ${breathInstruction} The breathiness level is set to ${decision.breathiness}/10.
- Pauses: ${pauseInstruction} The pause frequency level is set to ${decision.pauseFrequency}/10.
- Tone: ${smileInstruction} The smile level is set to ${decision.smile}/10.
- Energy and Confidence: Project a confidence level of ${decision.confidence}/10 and an overall energy of ${decision.energy}/10.

Remember: The ultimate goal is to maximize speech quality so it sounds indistinguishable from a real human voice actor.`;
}
