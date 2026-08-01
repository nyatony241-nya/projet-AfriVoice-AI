import express from 'express';
import cors from 'cors';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate Limiting sur les IPs utilisateurs
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    keyConfigured: !!(process.env.GEMINI_API_KEY),
    keyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET'
  });
});

// Middleware d'authentification Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const verifyAuthToken = async (req, res, next) => {
  if (!supabase) {
    // Si Supabase n'est pas configuré sur le serveur, on laisse passer (mode dev local sans auth stricte)
    // Mais en production, il faut bloquer si non configuré.
    console.warn("⚠️ AVERTISSEMENT: Supabase non configuré sur le serveur. Auth contournée.");
    return next();
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

// Endpoint de génération vocale (Gemini)
app.post('/api/generate', generateLimiter, verifyAuthToken, async (req, res) => {
  const { script, voiceId, customApiKey, options } = req.body;

  if (!script || !voiceId) {
    return res.status(400).json({ error: "Les paramètres 'script' et 'voiceId' sont requis." });
  }

  // Utiliser la clé API fournie par le client, ou celle du serveur par défaut
  const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') 
    ? customApiKey.trim() 
    : process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'ta_cle_gemini_ici') {
    return res.status(401).json({ error: "Aucune clé API Gemini configurée. Veuillez configurer .env.local ou entrer votre propre clé." });
  }

  console.log(`🎙️ Génération vocale - voix: ${voiceId}, script: ${script.substring(0, 50)}...`);
  console.log(`🔑 Clé API: ${apiKey.substring(0, 15)}...`);

  // Construction du prompt structuré pour piloter la voix (accent, genre, émotion, âge, débit, pitch)
  let systemInstructionText = "";
  if (options) {
    const accentStr = options.accentDescription || 'French';
    const countryStr = options.countryName || 'France';
    const genderStr = options.gender === 'male' ? 'male' : 'female';
    const emotionStr = options.emotion || 'neutral';
    const styleStr = options.style || 'pro';
    const speedVal = options.speed || 1.0;
    const pitchVal = options.pitch || 1.0;
    const ageVal = options.age || 30;

    // 1. Définition détaillée de l'âge
    let ageInstruction = `mature adult ${genderStr} voice, around ${ageVal} years old, balanced and confident`;
    if (ageVal >= 55) {
      ageInstruction = `senior elderly ${genderStr} voice, around ${ageVal} years old, with a mature, wise, warm, and slightly raspy/weathered vocal quality`;
    } else if (ageVal <= 22) {
      ageInstruction = `extremely young and youthful ${genderStr} voice, around ${ageVal} years old, with a fresh, light-hearted, high-pitched, and energetic tone`;
    } else if (ageVal < 35) {
      ageInstruction = `young adult ${genderStr} voice, around ${ageVal} years old, modern, clear, and professional`;
    } else if (ageVal >= 35 && ageVal < 55) {
      ageInstruction = `mature adult ${genderStr} voice, around ${ageVal} years old, highly professional, warm, corporate, authoritative, and confident`;
    }

    // 2. Définition du débit de parole (Speed)
    let pacingInstruction = "Speak at a moderate, normal conversational speed.";
    if (speedVal < 1.0) {
      pacingInstruction = "Speak slowly and deliberately, with long pauses between sentences, taking your time.";
    } else if (speedVal > 1.0) {
      pacingInstruction = "Speak very fast and rapidly, with quick transitions and minimal pauses, filled with urgency.";
    }

    // 3. Définition du pitch (hauteur de voix)
    let pitchInstruction = "Use a standard, balanced pitch.";
    if (pitchVal < 1.0) {
      pitchInstruction = "Use a very deep, low-pitched, bassy, and resonant voice tone.";
    } else if (pitchVal > 1.0) {
      pitchInstruction = "Use a high-pitched, bright, sharp, and clear voice tone.";
    }

    // 4. Définition du style
    let styleInstruction = "professional narrator, clear and articulate";
    if (styleStr === 'casual') styleInstruction = "casual and conversational, friendly vibe";
    else if (styleStr === 'advertising') styleInstruction = "high-energy radio DJ or commercial advertisement style";
    else if (styleStr === 'narration') styleInstruction = "storytelling tone, expressive and descriptive";

    // 5. Définition de l'émotion
    let emotionInstruction = "neutral, clear narrator tone";
    if (emotionStr === 'happy') emotionInstruction = "happy, cheerful, warm, smiling and enthusiastic tone";
    else if (emotionStr === 'serious') emotionInstruction = "serious, professional news reporter or radio journalist tone, formal and objective";
    else if (emotionStr === 'energetic') emotionInstruction = "highly energetic, punchy, exciting, commercial advertisement or radio DJ promo trailer style";
    else if (emotionStr === 'soft') emotionInstruction = "soft, gentle, quiet, soothing, calm, and intimate storytelling tone";

    const localExprInstruction = options.useLocalExpressions 
      ? "* Local rhythm: Emphasize regional slang pronunciations and native speech patterns strongly."
      : "";

    systemInstructionText = `You are a voice actor. You must absolutely adopt the following persona and NOT speak with a default American or British accent unless requested.
You MUST speak with an authentic African accent as requested.

Profile: ${voiceId}
Director's Notes:
* Accent: ${accentStr} (from ${countryStr})
* Vocal Actor: ${ageInstruction}
* Tone/Style: ${styleInstruction}
* Emotion: ${emotionInstruction}
* Pitch: ${pitchInstruction}
* Pacing: ${pacingInstruction}
${localExprInstruction ? `${localExprInstruction}\n` : ''}`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Use gemini-2.5-flash as it is the official multimodal model that supports audio generation and system instructions well
    // fallback to gemini-2.0-flash if needed, but 2.5 is the latest flash model
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Using gemini-2.0-flash which supports Audio out and complex instructions
      contents: script,
      config: {
        systemInstruction: systemInstructionText,
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

    console.log('📦 Réponse Gemini reçue, extraction des données audio...');
    
    const part = response.candidates?.[0]?.content?.parts?.[0];
    
    if (!part) {
      throw new Error("Réponse vide de Gemini - aucun candidat retourné");
    }

    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || 'audio/L16;rate=24000';

    if (!audioData) {
      console.error('Structure de la réponse:', JSON.stringify(response.candidates?.[0]?.content, null, 2));
      throw new Error("Aucune donnée audio dans la réponse Gemini");
    }

    console.log(`✅ Audio généré avec succès - mimeType: ${mimeType}, taille: ${audioData.length} chars`);

    return res.json({ 
      base64Audio: audioData,
      mimeType: mimeType
    });

  } catch (error) {
    console.error("❌ Erreur Gemini complète:", error);
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${JSON.stringify({ code: error.status, message: error.message })}).`
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Secure AfriVoice Backend (Gemini) running on port ${PORT}`);
  console.log(`🔑 Gemini API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes (' + process.env.GEMINI_API_KEY.substring(0, 12) + '...)' : 'NO - MISSING!'}`);
});
