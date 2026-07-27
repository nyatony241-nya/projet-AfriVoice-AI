export const generateVoiceOver = async (
  script: string, 
  voiceId: string
): Promise<Blob> => {
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
      voiceId,
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

  // Utilisation de fetch pour convertir proprement et rapidement le base64 en Blob (format WAV de Gemini)
  const base64Response = await fetch(`data:audio/wav;base64,${data.base64Audio}`);
  return await base64Response.blob();
};
