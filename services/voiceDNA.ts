import { VoiceDNA } from '../types';
import { VOICE_DNA as importedDNA, LOCAL_EXPRESSIONS as importedExpressions } from './voiceDNAData.js';

export const VOICE_DNA = importedDNA as Record<string, VoiceDNA>;
export const LOCAL_EXPRESSIONS = importedExpressions as Record<string, { fillers: string[]; greetings: string[]; emphasis: string[] }>;
