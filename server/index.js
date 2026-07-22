import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Modality } from '@google/genai';

dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors()); // Configure correctly for production
app.use(express.json({ limit: '10mb' }));

// Rate Limiting sur les IPs utilisateurs
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limite à 30 requêtes par IP
  message: { error: 'Trop de requêtes générées depuis cette adresse IP. Veuillez réessayer dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Récupère la liste de toutes les clés API Gemini configurées côté serveur.
 * Supporte : GEMINI_API_KEYS (séparées par des virgules), GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc., ou GEMINI_API_KEY.
 */
function getApiKeys() {
  const keys = [];

  // 1. Clés séparées par virgules dans GEMINI_API_KEYS
  if (process.env.GEMINI_API_KEYS) {
    const splitKeys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
    keys.push(...splitKeys);
  }

  // 2. Clés numérotées GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
  Object.keys(process.env).forEach(envKey => {
    if (envKey.startsWith('GEMINI_API_KEY_') || envKey.startsWith('GEMINI_KEY_')) {
      const val = process.env[envKey]?.trim();
      if (val && !keys.includes(val)) {
        keys.push(val);
      }
    }
  });

  // 3. Clés OpenRouter (ex: OPENROUTER_API_KEY)
  if (process.env.OPENROUTER_API_KEY && !keys.includes(process.env.OPENROUTER_API_KEY.trim())) {
    keys.push(process.env.OPENROUTER_API_KEY.trim());
  }

  // 4. Clé standard GEMINI_API_KEY ou API_KEY
  if (process.env.GEMINI_API_KEY && !keys.includes(process.env.GEMINI_API_KEY.trim())) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  if (process.env.API_KEY && !keys.includes(process.env.API_KEY.trim())) {
    keys.push(process.env.API_KEY.trim());
  }

  return keys.filter(k => k !== 'PLACEHOLDER_API_KEY');
}

// Index pour la rotation circulaire (Round-Robin)
let currentKeyIndex = 0;

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
  const { script, countryName, accentDescription, voiceName, settings, planId, customApiKey } = req.body;

  // Préparation du prompt et des paramètres
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

  const seedInput = `${script}-${countryName}-${voiceName}-${JSON.stringify(settings)}-${planId}`;
  const stableSeed = generateSeed(seedInput);

  // Déterminer les clés à essayer :
  let keysToTry = [];
  if (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') {
    keysToTry = [customApiKey.trim()];
  } else {
    const serverKeys = getApiKeys();
    if (serverKeys.length === 0) {
      return res.status(401).json({ error: "Aucune clé API Gemini ou OpenRouter n'est configurée sur le serveur. Veuillez configurer .env.local." });
    }
    const startIndex = currentKeyIndex % serverKeys.length;
    keysToTry = [
      ...serverKeys.slice(startIndex),
      ...serverKeys.slice(0, startIndex)
    ];
  }

  let lastError = null;

  for (let i = 0; i < keysToTry.length; i++) {
    const activeKey = keysToTry[i];
    try {
      const ai = new GoogleGenAI({ apiKey: activeKey });
          
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

      // Avancer l'index pour la prochaine requête si on utilise le pool serveur
      if (!customApiKey) {
        currentKeyIndex = (currentKeyIndex + 1) % keysToTry.length;
      }

      return res.json({ base64Audio });
    } catch (err) {
      console.warn(`[API Pool] Échec avec la clé #${i + 1} (${err.message})...`, err.cause || err);
      lastError = err;
    }
  }

  // Si toutes les clés ont échoué
  console.error("Toutes les clés API ont échoué :", lastError?.message || lastError, lastError?.cause || '');
  return res.status(500).json({ 
    error: `Impossible de générer l'audio. (${lastError?.message || 'Erreur API'}). Veuillez vérifier votre clé ou connexion.` 
  });
});

app.listen(PORT, () => {
  const keysCount = getApiKeys().length;
  console.log(`🚀 Secure AfriVoice Backend running on port ${PORT}`);
  console.log(`🔑 Pool de clés configurées (Gemini / OpenRouter) : ${keysCount} clé(s) active(s)`);
});


