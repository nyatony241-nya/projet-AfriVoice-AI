import { decode } from "./audioUtils";
import { VoiceSettings } from "../types";

export const generateAfricanVoiceOverRaw = async (
  script: string, 
  countryName: string, 
  accentDescription: string,
  voiceName: string,
  settings: VoiceSettings,
  token: string
): Promise<Uint8Array> => {
  // L'URL du backend : En local ça pointe vers Express (3001), sur Vercel ça pointe vers la Serverless Function
  const isDev = import.meta.env.DEV;
  const backendUrl = isDev ? 'http://localhost:3001/api/generate' : '/api/generate';

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      script,
      countryName,
      accentDescription,
      voiceName,
      settings
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
