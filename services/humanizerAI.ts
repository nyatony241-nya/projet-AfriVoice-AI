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
    ? "Incorporate organic, softly audible inhalations between major thoughts and sentences." 
    : "Keep breathing ultra-subtle and natural, imperceptible yet realistic.";
    
  const pauseInstruction = decision.pauseFrequency >= 6
    ? "Insert deliberate, expressive micro-pauses (100ms-300ms) before key nouns, verbs, and emphasis points."
    : "Maintain a smooth, continuous conversational flow with natural phrasing pauses.";
    
  const smileInstruction = decision.smile >= 6
    ? "Infuse an audible, warm, smiling timbre into the voice (higher formant resonance and bright vocal color)."
    : "Maintain a grounded, authoritative tone with subtle warmth where context calls for it.";

  return `=== HUMANIZER & ACOUSTIC DIRECTIVES ===
- Vocal Texture & Resonance: ${age}-year-old ${gender} voice. Resonate naturally with appropriate chest depth, vocal warmth, and clear acoustic fidelity.
- Organic Flow: Avoid any robotic cadence, mechanical pacing, or unnaturally flat pitch. Infuse life, dynamic pitch movement, and natural sentence contours.
- Cadence & Rhythm: Deliver with a ${decision.rhythm} rhythm profile.
- Pitch & Intonation: Apply a ${decision.intonation} intonation pattern for natural speech dynamics.
- Breathing Dynamics: ${breathInstruction} (Intensity: ${decision.breathiness}/10).
- Pacing & Micro-Pauses: ${pauseInstruction} (Frequency: ${decision.pauseFrequency}/10).
- Vocal Smile & Color: ${smileInstruction} (Warmth rating: ${decision.smile}/10).
- Energy & Projection: Project a confidence rating of ${decision.confidence}/10 and dynamic energy of ${decision.energy}/10.`;
}

