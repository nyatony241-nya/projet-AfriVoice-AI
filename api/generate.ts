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
    const { script, countryName, accentDescription, voiceName, settings, planId, customApiKey } = req.body;

    // La clé vient soit de l'utilisateur (via localStorage), soit des variables d'environnement Vercel
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: "Aucune clé API configurée. Veuillez l'ajouter dans les variables d'environnement Vercel (GEMINI_API_KEY)." });
    }

    const accentIntensity = planId === 'free' ? 'léger' : (planId === 'pro' ? 'très marqué et authentique' : 'naturel');
    const watermarkInstruction = planId === 'free' ? "\nNOTE: Ajoute OBLIGATOIREMENT une mention vocale 'Généré par AfriVoice AI' au début." : "";
    const localExpressionsInstruction = settings?.useLocalExpressions ? `\n- Utilise des expressions locales du ${countryName}.` : "";

    const emotionMap = {
      neutral: 'ton informatif',
      happy: 'ton joyeux',
      serious: 'ton sérieux',
      energetic: 'ton dynamique',
      soft: 'ton apaisant'
    };

    let speedInstruction = "vitesse normale";
    if (settings?.speed <= 0.6) speedInstruction = "vitesse très lente";
    else if (settings?.speed <= 0.8) speedInstruction = "vitesse lente";
    else if (settings?.speed >= 1.4) speedInstruction = "vitesse très rapide";
    else if (settings?.speed >= 1.2) speedInstruction = "vitesse rapide";

    let pitchInstruction = "tonalité normale";
    if (settings?.pitch < 0.8) pitchInstruction = "voix très grave et profonde";
    else if (settings?.pitch < 0.95) pitchInstruction = "voix légèrement grave";
    else if (settings?.pitch > 1.2) pitchInstruction = "voix très aiguë";
    else if (settings?.pitch > 1.05) pitchInstruction = "voix légèrement aiguë";

    let timbreInstruction = "timbre équilibré";
    if (settings?.timbre < 30) timbreInstruction = "timbre très chaud, velouté et sombre";
    else if (settings?.timbre < 45) timbreInstruction = "timbre légèrement chaud";
    else if (settings?.timbre > 75) timbreInstruction = "timbre très clair, brillant et cristallin";
    else if (settings?.timbre > 55) timbreInstruction = "timbre légèrement brillant";

    const prompt = `Génère une voix-off pour le ${countryName}. 
    Accent: ${accentDescription} (${accentIntensity}). 
    Genre: ${settings?.gender === 'female' ? 'Femme' : 'Homme'}. 
    Émotion: ${emotionMap[settings?.emotion || 'neutral']}.
    Âge souhaité: environ ${settings?.age || 30} ans.
    Détails techniques: ${pitchInstruction}, ${timbreInstruction}, ${speedInstruction}.
    Script: "${script}"${localExpressionsInstruction}${watermarkInstruction}`;

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
