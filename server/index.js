import express from 'express';
import cors from 'cors';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { humanizeScript } from '../services/phonetic-humanizer/index.js';
import { buildDirectorPrompt } from '../services/promptBuilder.js';

dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const app = express();
const PORT = process.env.PORT || 3005;

// CORS restreint aux origines légitimes
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origine non autorisée par CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    keyConfigured: !!(process.env.GEMINI_API_KEY),
    engine: 'VoicePromptEngine v3 — AI Voice Director'
  });
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const verifyAuthToken = async (req, res, next) => {
  if (!supabase) {
    return res.status(503).json({ error: "Service d'authentification indisponible. Configurez les variables Supabase." });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Token d'authentification manquant." });
  }
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Token d'authentification invalide ou expiré." });
  }
  req.user = data.user;
  next();
};

// ══════════════════════════════════════════════════════════════
// API ENDPOINT — Voice Generation
// ══════════════════════════════════════════════════════════════

app.post('/api/generate', generateLimiter, verifyAuthToken, async (req, res) => {
  const { script, voiceId, customApiKey, options } = req.body;

  if (!script || !voiceId) {
    return res.status(400).json({ error: "Les paramètres 'script' et 'voiceId' sont requis." });
  }

  const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') 
    ? customApiKey.trim() 
    : process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'ta_cle_gemini_ici') {
    return res.status(401).json({ error: "Aucune clé API Gemini configurée." });
  }

  try {
    // 1. Humanisation Phonétique du script si demandée
    const finalScript = options?.phoneticHumanizer
      ? humanizeScript(script, options.countryId, { contentStyle: options.contentStyle, emotion: options.emotion })
      : script;

    // 2. Construction chirurgicale du prompt à partir de la source de vérité partagée
    const { directorBrief: fullPrompt, actualVoiceId, voiceSeed } = buildDirectorPrompt({
      script,
      voiceId,
      countryId: options?.countryId || '',
      countryName: options?.countryName || 'Africa',
      gender: options?.gender || 'female',
      voiceVariant: options?.voiceVariant,
      age: options?.age || 30,
      accentLevel: options?.accentLevel || 'medium',
      useLocalExpressions: options?.useLocalExpressions,
      emotion: options?.emotion || 'neutral',
      contentStyle: options?.contentStyle,
      personality: options?.personality,
      vocalObjective: options?.vocalObjective,
      speed: options?.speed || 1.0,
      pitch: options?.pitch || 1.0,
      phoneticScript: finalScript,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ [AI Director v3] Pays: ${options?.countryId || 'auto'} | Style: ${options?.contentStyle || 'auto'} | Voix: ${actualVoiceId}`);
    }

    if (!global.aiClientCache) {
      global.aiClientCache = new Map();
    }
    if (!global.aiClientCache.has(apiKey)) {
      global.aiClientCache.set(apiKey, new GoogleGenAI({ apiKey }));
    }
    const ai = global.aiClientCache.get(apiKey);

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: actualVoiceId,
              },
            },
          },
          temperature: undefined,
          seed: voiceSeed,
        },
      });
    } catch (apiError) {
      console.error("❌ Erreur API Gemini:", apiError);

      // Détection des erreurs d'authentification (clé invalide / expirée)
      const errMessage = apiError?.message || '';
      const isAuthError = 
        apiError?.status === 401 || 
        errMessage.includes('API_KEY_INVALID') || 
        errMessage.includes('key not valid') ||
        errMessage.includes('UNAUTHENTICATED') ||
        errMessage.includes('invalid credentials');

      if (isAuthError) {
        return res.status(401).json({
          error: 'Clé API Gemini invalide ou expirée. Veuillez vérifier votre clé API (GEMINI_API_KEY) dans les variables d\'environnement Vercel ou dans les paramètres du Studio.',
          errorType: 'API_KEY_INVALID'
        });
      }
      throw apiError;
    }

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (!part) throw new Error("Réponse vide de Gemini");

    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || 'audio/L16;rate=24000';

    if (!audioData) {
      console.error('Structure réponse:', JSON.stringify(response.candidates?.[0]?.content, null, 2));
      throw new Error("Aucune donnée audio dans la réponse Gemini");
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Audio généré — mimeType: ${mimeType}, taille: ${audioData.length} chars`);
    }
    return res.json({ base64Audio: audioData, mimeType });

  } catch (error) {
    console.error("❌ Erreur de génération:", error.message || 'Erreur interne');
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}).`
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AfriVoice AI Voice Director v3 — port ${PORT}`);
  console.log(`🎯 Moteur: Narrative-Driven Director → Voice DNA (20 pays) → Scene-Based Prompts`);
  console.log(`🔑 Gemini: ${process.env.GEMINI_API_KEY ? '✅ Configurée' : '❌ NON CONFIGURÉE!'}`);
});
