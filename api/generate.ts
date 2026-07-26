import { ElevenLabsClient } from 'elevenlabs';

export default async function handler(req, res) {
  // Configurer les entêtes CORS pour autoriser l'accès depuis n'importe où
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
    const { script, voiceId, customApiKey } = req.body;

    if (!script || !voiceId) {
      return res.status(400).json({ error: "Les paramètres 'script' et 'voiceId' sont requis." });
    }

    // La clé vient soit de l'utilisateur, soit des variables d'environnement Vercel
    const apiKey = (customApiKey && customApiKey.trim() !== '' && customApiKey !== 'PLACEHOLDER_API_KEY') 
      ? customApiKey.trim() 
      : process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: "Aucune clé API ElevenLabs configurée. Veuillez l'ajouter dans les variables d'environnement Vercel (ELEVENLABS_API_KEY)." });
    }

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

    return res.status(200).json({ base64Audio });
  } catch (error) {
    console.error("Vercel Serverless Error (ElevenLabs):", error);
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}).` 
    });
  }
}
