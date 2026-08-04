export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const geminiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  res.status(200).json({
    status: 'AfriVoice API Health Check',
    environment: process.env.NODE_ENV || 'unknown',
    variables: {
      GEMINI_API_KEY: geminiKey ? `✅ Configurée (${geminiKey.substring(0, 6)}...)` : '❌ MANQUANTE',
      VITE_SUPABASE_URL: supabaseUrl ? `✅ Configurée (${supabaseUrl.substring(0, 30)}...)` : '❌ MANQUANTE',
      VITE_SUPABASE_ANON_KEY: supabaseKey ? `✅ Configurée (${supabaseKey.substring(0, 10)}...)` : '❌ MANQUANTE',
    },
    allConfigured: !!(geminiKey && supabaseUrl && supabaseKey),
    message: (!geminiKey || !supabaseUrl || !supabaseKey)
      ? '⚠️ Variables manquantes — Ajoutez-les dans Vercel Settings > Environment Variables puis Redeploy'
      : '✅ Tout est configuré. Si la génération échoue encore, vérifiez les logs Vercel.'
  });
}
