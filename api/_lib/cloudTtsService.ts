/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  AfriVoice — Google Cloud Text-to-Speech (gemini-2.5-flash-tts)    ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Avantage vs Gemini AI Studio :                                     ║
 * ║  • Quota publié : 150 RPM (vs 100 RPD sur AI Studio)               ║
 * ║  • Même modèle, mêmes voix → accents africains identiques           ║
 * ║  • Auth par compte de service → contournement du quota projet       ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Variables d'environnement requises (déjà utilisées pour le        ║
 * ║  clonage vocal, aucune nouvelle variable à créer) :                 ║
 * ║    GCP_PROJECT_ID     — ID du projet Google Cloud                  ║
 * ║    GCP_CLIENT_EMAIL   — email du compte de service                  ║
 * ║    GCP_PRIVATE_KEY    — clé privée RSA du compte de service         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import crypto from 'node:crypto';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CloudTtsCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface CloudTtsResult {
  audioData: string;   // base64 PCM L16 24kHz (même format que Gemini AI Studio)
  mimeType: string;    // 'audio/L16;rate=24000'
}

// ── Cache du token OAuth2 (in-memory, survit au warm serverless) ───────────────
let _tokenCache: { token: string; expMs: number } | null = null;

// ── Lecture des credentials depuis les variables d'environnement ───────────────
export function getCloudTtsCreds(): CloudTtsCreds | null {
  const p = (process.env.GCP_PROJECT_ID    || '').trim();
  const e = (process.env.GCP_CLIENT_EMAIL  || '').trim();
  const k = (process.env.GCP_PRIVATE_KEY   || '').trim();
  if (!p || !e || !k) return null;
  return { projectId: p, clientEmail: e, privateKey: k };
}

// ── Génération d'un token OAuth2 via JWT de compte de service ─────────────────
// Même algorithme que googleTtsService.js, mais mutualisé ici.
async function mintAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const cleanKey = privateKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim  = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const jwtUnsigned = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(jwtUnsigned);
  const sig = signer.sign(cleanKey, 'base64url');
  const jwt = `${jwtUnsigned}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[CloudTTS] Échec OAuth2 (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json() as { access_token: string };
  if (!json.access_token) throw new Error('[CloudTTS] Réponse OAuth2 sans access_token.');
  return json.access_token;
}

// ── Obtenir un token avec cache (évite un round-trip OAuth2 par requête) ───────
export async function getCloudTtsToken(creds: CloudTtsCreds): Promise<string> {
  const now = Date.now();
  // Conserver le token 55 min (expire à 60 min, marge de 5 min)
  if (_tokenCache && _tokenCache.expMs > now + 5 * 60 * 1000) {
    return _tokenCache.token;
  }
  const token = await mintAccessToken(creds.clientEmail, creds.privateKey);
  _tokenCache = { token, expMs: now + 55 * 60 * 1000 };
  return token;
}

// ── Appel Cloud TTS — UN seul chunk (respecte la limite de 4 000 bytes) ────────
/**
 * @param text           Texte à prononcer. Max ~1 500 chars / 4 000 bytes UTF-8.
 * @param directorPrompt Instructions vocales (accent, émotion, rythme). Max 4 000 bytes.
 * @param voiceName      Nom de voix Gemini : Aoede, Puck, Kore, Charon, Leda…
 * @param languageCode   BCP-47 : 'fr-FR' ou 'en-US'.
 */
export async function callCloudTtsSingle(
  creds: CloudTtsCreds,
  token: string,
  text: string,
  directorPrompt: string,
  voiceName: string,
  languageCode: string = 'fr-FR',
): Promise<CloudTtsResult> {
  // ── Vérification des limites (4 000 bytes par champ) ─────────────────────────
  const textBytes   = Buffer.byteLength(text,          'utf8');
  const promptBytes = Buffer.byteLength(directorPrompt,'utf8');

  if (textBytes   > 4000) throw Object.assign(new Error(`[CloudTTS] Texte trop long : ${textBytes} bytes (max 4 000)`),   { code: 'TEXT_TOO_LONG'   });
  if (promptBytes > 4000) throw Object.assign(new Error(`[CloudTTS] Prompt trop long : ${promptBytes} bytes (max 4 000)`), { code: 'PROMPT_TOO_LONG' });

  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    signal: AbortSignal.timeout(120_000),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': creds.projectId,
    },
    body: JSON.stringify({
      input: {
        text,
        // Le champ "prompt" est l'extension Gemini TTS de Cloud TTS :
        // il porte les instructions de mise en scène vocale (accent, émotion…)
        // séparément du texte à prononcer.
        prompt: directorPrompt,
      },
      voice: {
        languageCode,
        name: voiceName || 'Aoede',
        // Sélection explicite du modèle Gemini dans Cloud TTS
        model_name: 'gemini-2.5-flash-tts',
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',  // PCM 16-bit LE — même format que Gemini AI Studio
        sampleRateHertz: 24000,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw Object.assign(
      new Error(`[CloudTTS] HTTP ${res.status}: ${errText.slice(0, 400)}`),
      {
        status: res.status,
        retryAfter: Number(res.headers.get('retry-after') ?? 0),
        isQuota: res.status === 429,
        isAuth:  res.status === 401 || res.status === 403,
      }
    );
  }

  const data = await res.json() as { audioContent?: string };
  if (!data.audioContent) throw new Error('[CloudTTS] Réponse vide (audioContent absent).');

  return {
    audioData: data.audioContent,
    // LINEAR16 via Cloud TTS = PCM brut 16-bit LE, sans en-tête WAV
    // → même format que la sortie Gemini AI Studio, compatible avec le lecteur frontend
    mimeType: 'audio/L16;rate=24000',
  };
}

// ── Détection langue à partir du pays ─────────────────────────────────────────
const ENGLISH_COUNTRIES = new Set(['NG', 'GH', 'KE', 'ZA', 'UG', 'TZ', 'EG', 'ET']);

export function getLanguageCode(countryId?: string): string {
  return ENGLISH_COUNTRIES.has((countryId || '').toUpperCase()) ? 'en-US' : 'fr-FR';
}
