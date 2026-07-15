
import { GoogleGenAI, Modality } from "@google/genai";
import { decode } from "./audioUtils";
import { VoiceSettings } from "../types";

/**
 * Génère un code de hachage numérique à partir d'une chaîne de caractères pour le seed.
 */
function generateSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export const generateAfricanVoiceOverRaw = async (
  script: string, 
  countryName: string, 
  accentDescription: string,
  voiceName: string,
  settings: VoiceSettings,
  planId: string = 'free'
): Promise<Uint8Array> => {
  let API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('AFRIVOICE_API_KEY') || localStorage.getItem('GEMINI_API_KEY');
    if (localKey && localKey.trim() !== '' && localKey !== 'PLACEHOLDER_API_KEY') {
      API_KEY = localKey.trim();
    }
  }

  if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY' || API_KEY.trim() === '') {
    throw new Error("Clé API Gemini manquante. Veuillez connecter votre clé API en cliquant sur le bouton [🔑 Clé API] en haut à droite ou en configurant le fichier .env.local.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const accentIntensity = planId === 'free' ? 'léger' : (planId === 'pro' ? 'très marqué et authentique' : 'naturel');
  const watermarkInstruction = planId === 'free' ? "\nNOTE: Ajoute OBLIGATOIREMENT une mention vocale 'Généré par AfriVoice AI' au début." : "";
  const localExpressionsInstruction = settings.useLocalExpressions ? `\n- Utilise des expressions locales du ${countryName}.` : "";

  const emotionMap: Record<string, string> = {
    neutral: 'ton informatif',
    happy: 'ton joyeux',
    serious: 'ton sérieux',
    energetic: 'ton dynamique',
    soft: 'ton apaisant'
  };

  let speedInstruction = "vitesse normale";
  if (settings.speed <= 0.6) speedInstruction = "vitesse très lente";
  else if (settings.speed <= 0.8) speedInstruction = "vitesse lente";
  else if (settings.speed >= 1.4) speedInstruction = "vitesse très rapide";
  else if (settings.speed >= 1.2) speedInstruction = "vitesse rapide";

  // Pitch instructions
  let pitchInstruction = "tonalité normale";
  if (settings.pitch < 0.8) pitchInstruction = "voix très grave et profonde";
  else if (settings.pitch < 0.95) pitchInstruction = "voix légèrement grave";
  else if (settings.pitch > 1.2) pitchInstruction = "voix très aiguë";
  else if (settings.pitch > 1.05) pitchInstruction = "voix légèrement aiguë";

  // Timbre instructions
  let timbreInstruction = "timbre équilibré";
  if (settings.timbre < 30) timbreInstruction = "timbre très chaud, velouté et sombre";
  else if (settings.timbre < 45) timbreInstruction = "timbre légèrement chaud";
  else if (settings.timbre > 75) timbreInstruction = "timbre très clair, brillant et cristallin";
  else if (settings.timbre > 55) timbreInstruction = "timbre légèrement brillant";

  const prompt = `Génère une voix-off pour le ${countryName}. 
  Accent: ${accentDescription} (${accentIntensity}). 
  Genre: ${settings.gender === 'female' ? 'Femme' : 'Homme'}. 
  Émotion: ${emotionMap[settings.emotion || 'neutral']}.
  Âge souhaité: environ ${settings.age} ans.
  Détails techniques: ${pitchInstruction}, ${timbreInstruction}, ${speedInstruction}.
  Script: "${script}"${localExpressionsInstruction}${watermarkInstruction}`;

  const seedInput = `${script}-${countryName}-${voiceName}-${JSON.stringify(settings)}-${planId}`;
  const stableSeed = generateSeed(seedInput);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      seed: stableSeed,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Aucune donnée audio reçue.");

  return decode(base64Audio);
};
