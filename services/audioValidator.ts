export interface AudioValidationResult {
  isValid: boolean;
  errors: string[];
  durationSeconds?: number;
  sampleRate?: number;
  channels?: number;
}

/**
 * Validates a voice sample file (in buffer format).
 * Ensures it is a valid WAV, mono, 16kHz+, and around 10 seconds.
 */
export function validateAudioSample(audioBuffer: Buffer): AudioValidationResult {
  const errors: string[] = [];

  if (audioBuffer.length < 44) {
    return { isValid: false, errors: ['Fichier audio trop petit ou invalide (en-tête WAV manquant).'] };
  }

  // Parse standard WAV header values
  const riff = audioBuffer.toString('ascii', 0, 4);
  const wave = audioBuffer.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    errors.push('Le fichier doit être au format WAV (PCM).');
    return { isValid: false, errors };
  }

  const numChannels = audioBuffer.readUInt16LE(22);
  const sampleRate = audioBuffer.readUInt32LE(24);
  const byteRate = audioBuffer.readUInt32LE(28);
  const blockAlign = audioBuffer.readUInt16LE(32);
  const bitsPerSample = audioBuffer.readUInt16LE(34);

  // Checks
  if (numChannels !== 1) {
    errors.push(`Canaux: ${numChannels}. L'échantillon maître doit être en Mono (1 seul canal).`);
  }

  if (sampleRate < 16000) {
    errors.push(`Taux d'échantillonnage: ${sampleRate}Hz. Le taux d'échantillonnage minimum requis est de 16000Hz (16kHz).`);
  }

  // Calculate approximate duration based on byteRate
  const dataSize = audioBuffer.length - 44;
  const durationSeconds = byteRate > 0 ? parseFloat((dataSize / byteRate).toFixed(2)) : 0;

  if (durationSeconds < 5 || durationSeconds > 25) {
    errors.push(`Durée: ${durationSeconds}s. La durée de l'échantillon doit être idéalement proche de 10 secondes (entre 5 et 25s).`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    durationSeconds,
    sampleRate,
    channels: numChannels
  };
}
