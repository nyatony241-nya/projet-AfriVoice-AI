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

app.post('/api/generate', generateLimiter, async (req, res) => {
  const { script, countryName, accentDescription, voiceName, settings } = req.body;

  let speedDirective = "Parle à un rythme naturel et fluide.";
  if (settings?.speed <= 0.8) speedDirective = "PARLE TRÈS LENTEMENT, en articulant chaque mot et en prenant de longues pauses.";
  else if (settings?.speed >= 1.2) speedDirective = "PARLE TRÈS RAPIDEMENT, avec urgence et sans pause.";

  const prompt = `INSTRUCTIONS POUR L'ACTEUR VOCAL :
Tu es un acteur spécialisé dans les voix-off.
Accent demandé : ${countryName} - ${accentDescription}.
Rythme : ${speedDirective}

LIT LE SCRIPT SUIVANT EXACTEMENT TEL QU'IL EST, SANS COMMENTAIRE :
"${script}"`;

  const seedInput = `${script}-${countryName}-${voiceName}-${JSON.stringify(settings)}`;
  const stableSeed = generateSeed(seedInput);

  // Déterminer les clés à essayer :
  let keysToTry = [];
  const serverKeys = getApiKeys();
    if (serverKeys.length === 0) {
      return res.status(401).json({ error: "Aucune clé API Gemini ou OpenRouter n'est configurée sur le serveur. Veuillez configurer .env.local." });
    }
  const startIndex = currentKeyIndex % serverKeys.length;
  keysToTry = [
    ...serverKeys.slice(startIndex),
    ...serverKeys.slice(0, startIndex)
  ];

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
      currentKeyIndex = (currentKeyIndex + 1) % keysToTry.length;

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


