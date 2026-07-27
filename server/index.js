import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';

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
    return res.status(401).json({ error: "Aucune clé API Gemini n'est configurée sur le serveur. Veuillez configurer .env.local ou entrer votre propre clé sur le site." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Appel à l'API Gemini (Modèle 2.5 flash avec sortie audio)
    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: script,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceId, // "Puck", "Aoede", etc.
              },
            },
          },
        },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
        throw new Error("No audio data returned from Gemini");
    }

    return res.json({ base64Audio: audioData });
  } catch (error) {
    console.error("❌ Erreur Gemini :", error.message || error);
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}). Veuillez vérifier votre clé API ou votre quota.` 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Secure AfriVoice Backend (Gemini) running on port ${PORT}`);
  console.log(`🔑 Gemini API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
});
