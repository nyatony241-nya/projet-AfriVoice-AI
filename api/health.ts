export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Pool de clés : GEMINI_API_KEYS (liste) + GEMINI_API_KEY, dédoublonné — on n'expose que le NOMBRE.
  const poolSize = new Set(
    [process.env.GEMINI_API_KEYS || '', process.env.GEMINI_API_KEY || '']
      .join(',')
      .split(/[\s,;]+/)
      .map(k => k.trim())
      .filter(k => k && k !== 'ta_cle_gemini_ici' && k !== 'PLACEHOLDER_API_KEY' && !k.startsWith('COLLE_TA_CLE'))
  ).size;
  const geminiKey = poolSize > 0;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  res.status(200).json({
    status: 'AfriVoice API Health Check',
    environment: process.env.NODE_ENV || 'unknown',
    variables: {
      GEMINI_KEY_POOL: geminiKey ? `✅ ${poolSize} clé(s) active(s) ≈ ${poolSize * 100} générations/jour` : '❌ MANQUANTE',
      VITE_SUPABASE_URL: supabaseUrl ? `✅ Configurée (${supabaseUrl.substring(0, 30)}...)` : '❌ MANQUANTE',
      VITE_SUPABASE_ANON_KEY: supabaseKey ? `✅ Configurée (${supabaseKey.substring(0, 10)}...)` : '❌ MANQUANTE',
    },
    allConfigured: !!(geminiKey && supabaseUrl && supabaseKey),
    message: (!geminiKey || !supabaseUrl || !supabaseKey)
      ? '⚠️ Variables manquantes — Ajoutez-les dans Vercel Settings > Environment Variables puis Redeploy'
      : '✅ Tout est configuré. Si la génération échoue encore, vérifiez les logs Vercel.'
  });
}
