import express from 'express';
import cors from 'cors';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

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

// Endpoint de génération vocale (Gemini)
app.post('/api/generate', generateLimiter, async (req, res) => {
  const { script, voiceId, customApiKey } = req.body;

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

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
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
