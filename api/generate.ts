import { GoogleGenAI, Modality } from '@google/genai';

export default async function handler(req, res) {
  // Configurer les entêtes CORS pour autoriser l'accès depuis n'importe où
  res.setHeader('Access-Control-Allow-Credentials', true);
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
    const { script, countryName, accentDescription, voiceName, settings } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Aucune clé API configurée sur le serveur." });
    }

    let speedDirective = "Parle à un rythme naturel et fluide.";
    if (settings?.speed <= 0.8) speedDirective = "PARLE TRÈS LENTEMENT, en articulant chaque mot et en prenant de longues pauses.";
    else if (settings?.speed >= 1.2) speedDirective = "PARLE TRÈS RAPIDEMENT, avec urgence et sans pause.";

    const prompt = `INSTRUCTIONS POUR L'ACTEUR VOCAL :
Tu es un acteur spécialisé dans les voix-off.
Accent demandé : ${countryName} - ${accentDescription}.
Rythme : ${speedDirective}

LIT LE SCRIPT SUIVANT EXACTEMENT TEL QU'IL EST, SANS COMMENTAIRE :
"${script}"`;

    // Connexion à l'API Gemini
    const ai = new GoogleGenAI({ apiKey });
            
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: prompt,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName || "Puck"
            }
          }
        }
      }
    });

    if (!response || !response.candidates || !response.candidates[0] || !response.candidates[0].content) {
      throw new Error("Réponse invalide de l'API Gemini");
    }

    const base64Audio = response.candidates[0].content.parts[0].inlineData.data;

    return res.status(200).json({ base64Audio });
  } catch (error) {
    console.error("Vercel Serverless Error:", error);
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}).` 
    });
  }
}
