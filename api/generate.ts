import { GoogleGenAI, Modality } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Configurer les entêtes CORS pour autoriser l'accès depuis n'importe où
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Non autorisé. Connectez-vous.' });
    }
    const token = authHeader.split(' ')[1];

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Configuration Supabase manquante côté serveur.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée.' });
    }

    // Vérifier le quota
    const { data: profile } = await supabase.from('profiles').select('plan_id, seconds_used').eq('id', user.id).single();
    if (!profile) {
      return res.status(403).json({ error: 'Profil introuvable.' });
    }

    const { script, countryName, accentDescription, voiceName, settings } = req.body;
    const estimatedSeconds = Math.ceil(script.length / 15); // ~15 chars per sec roughly

    let limit = 90; // Free = 90 seconds
    if (profile.plan_id === 'creator') limit = 3600; // 60 mins
    if (profile.plan_id === 'pro') limit = 9600; // 160 mins

    if (profile.seconds_used + estimatedSeconds > limit) {
      return res.status(403).json({ error: `Quota épuisé. Vous avez utilisé ${profile.seconds_used}s / ${limit}s. Veuillez souscrire à un forfait.` });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Aucune clé API configurée sur le serveur." });
    }

    let speedDirective = "Parle à un rythme naturel et fluide.";
    if (settings?.speed <= 0.8) speedDirective = "PARLE TRÈS LENTEMENT, en articulant chaque mot et en prenant de longues pauses.";
    else if (settings?.speed >= 1.2) speedDirective = "PARLE TRÈS RAPIDEMENT, avec urgence et sans pause.";

    const prompt = `INSTRUCTIONS POUR L'ACTEUR VOCAL :
Tu es un acteur spécialisé dans les voix-off.
Accent demandé : ${countryName} - ${accentDescription}.
Rythme : ${speedDirective}

LIT LE SCRIPT SUIVANT EXACTEMENT TEL QU'IL EST, SANS COMMENTAIRE :
"${script}"`;

    // Connexion à l'API Gemini
    const ai = new GoogleGenAI({ apiKey });
            
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

    // Déduire le quota de l'utilisateur
    const { error: updateError } = await supabase.from('profiles').update({
      seconds_used: profile.seconds_used + estimatedSeconds
    }).eq('id', user.id);

    if (updateError) {
      console.error('Erreur lors de la mise à jour du quota:', updateError);
    }

    return res.status(200).json({ base64Audio });
  } catch (error: any) {
    console.error("Vercel Serverless Error:", error);
    return res.status(500).json({ 
      error: `Impossible de générer l'audio. (${error.message || 'Erreur API'}).` 
    });
  }
}
