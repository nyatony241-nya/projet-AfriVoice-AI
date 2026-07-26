import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { ElevenLabsClient } from 'elevenlabs';

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

// Endpoint de génération vocale (ElevenLabs)
app.post('/api/generate', generateLimiter, async (req, res) => {
  const { script, voiceId, customApiKey } = req.body;

  if (!script || !voiceId) {
    return res.status(400).json({ error: "Les paramètres 'script' et 'voiceId' sont requis." });
  }

  // Utiliser la clé API fournie par le client, ou celle du serveur par défaut
  const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') 
    ? customApiKey.trim() 
    : process.env.ELEVENLABS_API_KEY;

  if (!apiKey || apiKey === 'ta_cle_elevenlabs_ici') {
    return res.status(401).json({ error: "Aucune clé API ElevenLabs n'est configurée sur le serveur. Veuillez configurer .env.local ou entrer votre propre clé sur le site." });
  }

  try {
    const client = new ElevenLabsClient({ apiKey });

    // Appel à l'API ElevenLabs (Modèle multilingue V2 pour un français natif parfait)
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text: script,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128", // Format MP3 haute qualité
    });

    // Convertir le flux en Buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    
    // Envoyer en base64 au frontend
    const base64Audio = audioBuffer.toString('base64');
    
    return res.json({ base64Audio });
  } catch (error) {
    console.error("❌ Erreur ElevenLabs :", error.message || error);
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}). Veuillez vérifier votre clé API ou votre quota.` 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Secure AfriVoice Backend (ElevenLabs) running on port ${PORT}`);
  console.log(`🔑 ElevenLabs API Key configured: ${process.env.ELEVENLABS_API_KEY ? 'Yes' : 'No'}`);
});
