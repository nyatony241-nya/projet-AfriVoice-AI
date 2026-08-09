import crypto from 'crypto';

interface GoogleTtsCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  location: string;
}

/**
 * Helper to obtain OAuth2 access token for Google Cloud via native Node.js crypto (no external JWT library needed).
 */
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const cleanKey = privateKey.replace(/\\n/g, '\n');
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Claim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(cleanKey, 'base64url');

  const jwt = `${signatureInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Échec d'obtention du token Google OAuth2: ${errText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Gets GCP credentials from environment variables.
 */
export function getGcpCredentials(): GoogleTtsCredentials | null {
  const projectId = process.env.GCP_PROJECT_ID || '';
  const clientEmail = process.env.GCP_CLIENT_EMAIL || '';
  const privateKey = process.env.GCP_PRIVATE_KEY || '';
  const location = process.env.GCP_LOCATION || 'us-central1';

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }
  return { projectId, clientEmail, privateKey, location };
}

/**
 * Generates a persistent voiceCloningKey using Chirp 3 Instant Custom Voice.
 * @param params base64 encoded audio strings for sample and consent statement.
 */
export async function generateGoogleVoiceCloningKey(params: {
  masterVoiceSampleBase64: string;
  consentAudioBase64: string;
  languageCode: string;
}): Promise<string> {
  const credentials = getGcpCredentials();
  if (!credentials) {
    throw new Error('Variables d\'environnement GCP manquantes pour la réplication vocale (GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY).');
  }

  const token = await getAccessToken(credentials.clientEmail, credentials.privateKey);
  const url = `https://texttospeech.googleapis.com/v1beta1/projects/${credentials.projectId}/locations/${credentials.location}/voices:generateVoiceCloningKey`;

  const payload = {
    reference_audio: {
      content: params.masterVoiceSampleBase64
    },
    voice_talent_consent: {
      content: params.consentAudioBase64
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google generateVoiceCloningKey API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { voiceCloningKey: string };
  if (!data.voiceCloningKey) {
    throw new Error('La réponse Google n\'a renvoyé aucune voiceCloningKey valide.');
  }

  return data.voiceCloningKey;
}

/**
 * Synthesizes audio using a persistent voiceCloningKey on Chirp 3 Instant Custom Voice.
 */
export async function synthesizeWithGoogleVoiceClone(params: {
  text: string;
  voiceCloningKey: string;
  languageCode: string;
  speakingRate?: number;
}): Promise<string> {
  const credentials = getGcpCredentials();
  if (!credentials) {
    throw new Error('Variables d\'environnement GCP manquantes.');
  }

  const token = await getAccessToken(credentials.clientEmail, credentials.privateKey);
  const url = `https://texttospeech.googleapis.com/v1beta1/text:synthesize`;

  const payload = {
    input: {
      text: params.text
    },
    voice: {
      languageCode: params.languageCode,
      voiceClone: {
        voiceCloningKey: params.voiceCloningKey
      }
    },
    audioConfig: {
      audioEncoding: 'LINEAR16',
      speakingRate: params.speakingRate || 1.0
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Cloud TTS synthesize error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { audioContent: string };
  if (!data.audioContent) {
    throw new Error('Aucun audioContent reçu de la synthèse Google.');
  }

  return data.audioContent; // Base64 WAV
}
