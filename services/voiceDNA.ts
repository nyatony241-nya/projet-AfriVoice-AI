import { VoiceDNA } from '../types';
// @ts-ignore
import { VOICE_DNA as rawDNA, LOCAL_EXPRESSIONS as rawExpressions } from './voiceDNA.js';

export const VOICE_DNA = rawDNA as Record<string, VoiceDNA>;
export const LOCAL_EXPRESSIONS = rawExpressions as Record<string, { fillers: string[]; greetings: string[]; emphasis: string[] }>;
export { rawDNA, rawExpressions };
