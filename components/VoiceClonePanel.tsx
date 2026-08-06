import React, { useState, useRef, useEffect } from 'react';
import { ClonedVoiceProfile } from '../types';
import { triggerCelebration } from './ConfettiHelper';
import { supabase } from '../services/supabaseClient';

interface VoiceClonePanelProps {
  isPro: boolean;
  isDark: boolean;
  isEn: boolean;
  clonedVoiceProfile: ClonedVoiceProfile | null;
  onSaveProfile: (profile: ClonedVoiceProfile) => void;
  onDeleteProfile: () => void;
  onSelectClonedVoice: (active: boolean) => void;
  isClonedVoiceActive: boolean;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  onRechargeCloneQuota?: () => void;
}

export const VoiceClonePanel: React.FC<VoiceClonePanelProps> = ({
  isPro,
  isDark,
  isEn,
  clonedVoiceProfile,
  onSaveProfile,
  onDeleteProfile,
  onSelectClonedVoice,
  isClonedVoiceActive,
  addToast,
  onRechargeCloneQuota,
}) => {
  const [voiceName, setVoiceName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'record' | 'upload'>('upload');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Micro Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      addToast(
        'error',
        isEn ? 'Microphone Error' : 'Erreur Microphone',
        isEn ? 'Could not access microphone.' : 'Impossible d’accéder au microphone.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Submit Cloning Request
  const handleCreateClone = async () => {
    const nameToUse = voiceName.trim() || (isEn ? 'My Cloned Voice' : 'Ma Voix Clonée');
    const audioFileToUpload = mode === 'upload' ? uploadedFile : recordedBlob;

    if (!audioFileToUpload) {
      addToast(
        'warning',
        isEn ? 'Audio Sample Missing' : 'Échantillon vocal manquant',
        isEn ? 'Please record or upload an audio sample (10-60 sec).' : 'Veuillez enregistrer ou charger un extrait audio de votre voix.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioFileToUpload, 'voice_sample.wav');
      formData.append('name', nameToUse);

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const endpoint = isDev ? 'http://localhost:3005/api/clone-voice' : '/api/clone-voice';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEn ? 'Voice cloning failed.' : 'Échec du clonage vocal.'));
      }

      const newProfile: ClonedVoiceProfile = {
        elevenLabsVoiceId: data.voice_id,
        name: nameToUse,
        createdAt: Date.now(),
        usedSeconds: 0,
        maxSeconds: 900, // 15 min limit
      };

      onSaveProfile(newProfile);
      onSelectClonedVoice(true);
      triggerCelebration();

      addToast(
        'success',
        isEn ? 'Voice Cloned Successfully!' : 'Voix Clonée avec Succès !',
        isEn ? `Your voice "${nameToUse}" is now active in Studio HD.` : `Votre empreinte vocale "${nameToUse}" est maintenant prête et active.`
      );

      // Reset local state
      setRecordedBlob(null);
      setUploadedFile(null);
      setVoiceName('');
    } catch (err: any) {
      console.error('Cloning API error:', err);
      addToast(
        'error',
        isEn ? 'Cloning Failed' : 'Échec du Clonage Vocal',
        err.message || (isEn ? 'Server error during voice processing.' : 'Erreur lors du traitement de l’empreinte vocale.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Render Lock Banner if not PRO
  if (!isPro) {
    return (
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#12141C]/80 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50/50 to-amber-50/30 border-indigo-200'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl">
              🧬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {isEn ? 'Instant Voice Cloning (1 Voice)' : 'Clonage Vocal Instantané (1 Voix)'}
                </h3>
                <span className="text-[10px] bg-indigo-500 text-white font-black px-2 py-0.5 rounded-full uppercase">
                  PRO
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {isEn
                  ? 'Clone your own voice or any talent voice from a 15-second audio sample.'
                  : 'Dupliquez votre propre voix ou celle de votre talent à partir d’un extrait audio de 15 secondes.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => addToast('info', 'Offre PRO', 'Passez au forfait PRO pour débloquer le clonage vocal.')}
            className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 whitespace-nowrap"
          >
            🔒 {isEn ? 'Unlock with PRO' : 'Débloquer avec PRO'}
          </button>
        </div>
      </div>
    );
  }

  // Active Clone Card Render
  if (clonedVoiceProfile) {
    const remainingMin = Math.max(0, Math.ceil((clonedVoiceProfile.maxSeconds - clonedVoiceProfile.usedSeconds) / 60));
    const percentUsed = Math.min(100, Math.round((clonedVoiceProfile.usedSeconds / clonedVoiceProfile.maxSeconds) * 100));

    return (
      <div className={`p-6 rounded-3xl border transition-all ${
        isClonedVoiceActive
          ? isDark ? 'bg-indigo-950/40 border-indigo-500/50 ring-2 ring-indigo-500/30' : 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
          : isDark ? 'bg-[#12141C] border-white/10' : 'bg-white border-zinc-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black ${
              isClonedVoiceActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' : 'bg-zinc-800 text-zinc-400'
            }`}>
              🧬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {clonedVoiceProfile.name}
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {isEn ? 'Cloned HD Voice' : 'Voix Clonée HD'}
                </span>
              </div>
              <p className={`text-xs mt-1 font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {isEn ? 'Quota:' : 'Quota Voix Clonée :'} <span className="font-bold text-white">{remainingMin} min</span> {isEn ? 'remaining this month' : 'restantes ce mois'} ({percentUsed}% {isEn ? 'used' : 'utilisé'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => onSelectClonedVoice(!isClonedVoiceActive)}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
                isClonedVoiceActive
                  ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/30'
                  : isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
              }`}
            >
              {isClonedVoiceActive
                ? (isEn ? '✓ Selected' : '✓ Sélectionnée')
                : (isEn ? 'Use Cloned Voice' : 'Utiliser cette Voix')}
            </button>

            <button
              onClick={() => {
                if (confirm(isEn ? 'Delete this cloned voice?' : 'Voulez-vous vraiment supprimer cette voix clonée ?')) {
                  onDeleteProfile();
                  addToast('info', isEn ? 'Voice deleted' : 'Voix supprimée');
                }
              }}
              title={isEn ? 'Delete Voice' : 'Supprimer la voix'}
              className="p-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Quota Bar */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mr-4">
            <div
              className={`h-full transition-all duration-500 ${percentUsed > 80 ? 'bg-amber-500' : 'bg-indigo-500'}`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          {onRechargeCloneQuota && remainingMin <= 3 && (
            <button
              onClick={onRechargeCloneQuota}
              className="text-[10px] font-black uppercase text-amber-400 hover:underline whitespace-nowrap"
            >
              ⚡ {isEn ? '+10 Min Recharge' : '+10 Min Recharge'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Creation Form Render
  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      isDark ? 'bg-[#12141C] border-white/10' : 'bg-white border-zinc-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xl">
            🧬
          </div>
          <div>
            <h3 className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {isEn ? 'Create Your Cloned Voice HD' : 'Créer votre Voix Clonée HD'}
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {isEn ? '15 minutes included in your PRO plan' : '15 minutes de synthèse vocale clonée incluses dans votre forfait PRO'}
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-zinc-800/80 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setMode('upload')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
              mode === 'upload' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            📁 Upload
          </button>
          <button
            onClick={() => setMode('record')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
              mode === 'record' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🎙️ {isEn ? 'Micro' : 'Micro'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Name Input */}
        <div>
          <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {isEn ? 'Voice Name' : 'Nom de la Voix'}
          </label>
          <input
            type="text"
            placeholder={isEn ? 'e.g. My Studio Voice, Commercial Voice...' : 'ex: Ma Voix Pub, Voix Radio Studio...'}
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none transition-all ${
              isDark ? 'bg-[#09090B] border-white/10 text-white focus:border-indigo-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-indigo-500'
            }`}
          />
        </div>

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-2xl p-6 text-center transition-all bg-zinc-900/30">
            <input
              type="file"
              accept="audio/*"
              id="voice-audio-upload"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadedFile(e.target.files[0]);
                }
              }}
            />
            <label htmlFor="voice-audio-upload" className="cursor-pointer block space-y-2">
              <div className="text-3xl">🎵</div>
              <div className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {uploadedFile ? `Fichier sélectionné : ${uploadedFile.name}` : (isEn ? 'Click to upload audio sample' : 'Cliquez pour charger votre fichier audio')}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                MP3, WAV, M4A — {isEn ? '15 to 60 seconds recommended' : '15 à 60 secondes recommandées pour une précision optimale'}
              </div>
            </label>
          </div>
        )}

        {/* Record Mode */}
        {mode === 'record' && (
          <div className="border border-white/10 rounded-2xl p-6 text-center bg-zinc-900/40 space-y-3">
            <div className="flex items-center justify-center gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95"
                >
                  <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                  {isEn ? 'Start Recording' : 'Démarrer l’enregistrement'}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 border border-red-500/50 shadow-lg transition-all active:scale-95"
                >
                  <span className="w-3 h-3 rounded-sm bg-red-500" />
                  {isEn ? 'Stop Recording' : 'Arrêter l’enregistrement'} ({recordingSeconds}s)
                </button>
              )}
            </div>

            {recordedBlob && !isRecording && (
              <div className="text-xs font-mono text-emerald-400 font-bold">
                ✓ {isEn ? 'Recording saved!' : 'Extrait audio enregistré avec succès !'} ({recordingSeconds}s)
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleCreateClone}
          disabled={isLoading || (!uploadedFile && !recordedBlob)}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-98 flex items-center justify-center gap-2 ${
            isLoading || (!uploadedFile && !recordedBlob)
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{isEn ? 'Cloning Voice & Extracting DNA...' : 'Clonage & Extraction Empreinte Vocale IA...'}</span>
            </>
          ) : (
            <>
              <span>🧬 {isEn ? 'Generate Instant Voice Clone' : 'Générer le Clonage Vocal Instantané'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default VoiceClonePanel;
