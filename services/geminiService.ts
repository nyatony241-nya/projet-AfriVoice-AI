import { decode } from "./audioUtils";
import { VoiceSettings } from "../types";

export const generateAfricanVoiceOverRaw = async (
  script: string, 
  countryName: string, 
  accentDescription: string,
  voiceName: string,
  settings: VoiceSettings,
  planId: string = 'free'
): Promise<Uint8Array> => {
  let customApiKey = '';
  
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('AFRIVOICE_API_KEY') || localStorage.getItem('GEMINI_API_KEY');
    if (localKey && localKey.trim() !== '' && localKey !== 'PLACEHOLDER_API_KEY') {
      customApiKey = localKey.trim();
    }
  }

  // L'URL du backend : En local ça pointe vers Express (3001), sur Vercel ça pointe vers la Serverless Function
  const isDev = import.meta.env.DEV;
  const backendUrl = isDev ? 'http://localhost:3001/api/generate' : '/api/generate';

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script,
      countryName,
      accentDescription,
      voiceName,
      settings,
      planId,
      customApiKey
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erreur lors de la communication avec le serveur vocal sécurisé.");
  }

  if (!data.base64Audio) {
    throw new Error("Aucune donnée audio reçue du serveur.");
  }

  return decode(data.base64Audio);
};
