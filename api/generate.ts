import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Configurer les entêtes CORS pour autoriser l'accès depuis n'importe où
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Gérer la requête de pre-flight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Refuser tout ce qui n'est pas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { script, voiceId, customApiKey } = req.body;

    if (!script || !voiceId) {
      return res.status(400).json({ error: "Les paramètres 'script' et 'voiceId' sont requis." });
    }

    // La clé vient soit de l'utilisateur, soit des variables d'environnement Vercel
    const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') 
      ? customApiKey.trim() 
      : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: "Aucune clé API Gemini configurée. Veuillez l'ajouter dans les variables d'environnement Vercel (GEMINI_API_KEY)." });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Appel à l'API Gemini pour la génération vocale
    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts',
        contents: script,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceId,
              },
            },
          },
        },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
        throw new Error("No audio data returned from Gemini");
    }

    return res.status(200).json({ base64Audio: audioData });
  } catch (error: any) {
    console.error("Vercel Serverless Error (Gemini):", error);
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}).` 
    });
  }
}
