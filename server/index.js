import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Modality } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors()); // Configure correctly for production
app.use(express.json({ limit: '10mb' }));

// Rate Limiting
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` (here, per 15 minutes)
  message: { error: 'Trop de requêtes générées depuis cette adresse IP. Veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Génère un code de hachage numérique à partir d'une chaîne de caractères pour le seed.
 */
function generateSeed(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Endpoint de génération vocale
app.post('/api/generate', generateLimiter, async (req, res) => {
  try {
    const { script, countryName, accentDescription, voiceName, settings, planId, customApiKey } = req.body;

    // Use custom API key if provided, else use the server's environment variable
    const API_KEY = customApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!API_KEY) {
      return res.status(401).json({ error: "Clé API Gemini manquante côté serveur ou non fournie par le client." });
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const accentIntensity = planId === 'free' ? 'léger' : (planId === 'pro' ? 'très marqué et authentique' : 'naturel');
    const watermarkInstruction = planId === 'free' ? "\nNOTE: Ajoute OBLIGATOIREMENT une mention vocale 'Généré par AfriVoice AI' au début." : "";
    const localExpressionsInstruction = settings.useLocalExpressions ? `\n- Utilise des expressions locales du ${countryName}.` : "";

    const emotionMap = {
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
    if (!base64Audio) {
      throw new Error("Aucune donnée audio reçue.");
    }

    res.json({ base64Audio });
  } catch (error) {
    console.error("Gemini API Error:", error.message || error);
    res.status(500).json({ error: error.message || "Erreur lors de la génération vocale." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Secure AfriVoice Backend running on port ${PORT}`);
});
