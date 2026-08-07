import { humanizeScript } from "../services/phonetic-humanizer/index.js";

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "Clé API ElevenLabs non configurée dans Vercel. Veuillez ajouter ELEVENLABS_API_KEY dans vos variables d'environnement Vercel."
      });
    }

    const { voiceId, script, speed, options } = req.body || {};
    if (!voiceId || !script) {
      return res.status(400).json({ error: "voiceId et script sont requis." });
    }

    const countryId = options?.countryId || 'CI';
    
    // Application de la transformation phonétique africaine (humanisation phonétique)
    let finalText = script;
    if (options?.phoneticHumanizer !== false) {
      finalText = humanizeScript(script, countryId, {
        contentStyle: options?.contentStyle,
        emotion: options?.emotion,
      });
    }

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: finalText,
        // eleven_multilingual_v2 est LE modèle de référence pour les accents africains et la prosodie française/multilingue
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          // similarity_boost à 0.82 conserve 100% du timbre de la voix clonée tout en permettant à l'accent et à la mélodie africaine de s'exprimer
          similarity_boost: 0.82,
          // stability à 0.40 apporte la chaleur, le lilt et l'expressivité naturelle des voix africaines
          stability: 0.40,
          // style à 0.35 donne l'intonation stylistique sans exagération
          style: 0.35,
          use_speaker_boost: true,
        },
        ...(speed && speed !== 1.0 ? { speed } : {}),
      }),
    });

    if (!elevenRes.ok) {
      const errJson = await elevenRes.json().catch(() => ({}));
      console.error('ElevenLabs TTS Error:', errJson);
      return res.status(elevenRes.status).json({
        error: errJson.detail?.message || "Échec de la génération avec la voix clonée ElevenLabs."
      });
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({ base64Audio, mimeType: 'audio/mpeg' });
  } catch (err: any) {
    console.error('❌ Error /api/generate-cloned:', err);
    return res.status(500).json({ error: err?.message || 'Erreur lors de la génération avec la voix clonée.' });
  }
}

