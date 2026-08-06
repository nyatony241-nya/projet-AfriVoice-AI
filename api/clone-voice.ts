import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    await runMiddleware(req, res, upload.single('audio'));
    const fileReq = req as any;

    if (!fileReq.file) {
      return res.status(400).json({ error: "Aucun fichier audio n'a été fourni pour le clonage." });
    }

    const name = fileReq.body?.name || 'Ma Voix Clonée';
    const blob = new Blob([fileReq.file.buffer], { type: fileReq.file.mimetype || 'audio/wav' });

    const formData = new FormData();
    formData.append('name', name);
    formData.append('files', blob, fileReq.file.originalname || 'sample.wav');

    const elevenRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    });

    const data = await elevenRes.json();
    if (!elevenRes.ok) {
      console.error('ElevenLabs Clone Error:', data);
      return res.status(elevenRes.status).json({
        error: data.detail?.message || data.message || "Erreur lors de la création du clone vocal chez ElevenLabs."
      });
    }

    return res.status(200).json({ voice_id: data.voice_id, name });
  } catch (err: any) {
    console.error('❌ Error /api/clone-voice:', err);
    return res.status(500).json({ error: err?.message || 'Erreur interne lors du clonage vocal.' });
  }
}
