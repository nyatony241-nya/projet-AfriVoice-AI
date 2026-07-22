import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, VOICE_OPTIONS } from './constants';
import { Country, GenerationState, VoiceSettings, HistoryItem, Language } from './types';
import CountryCard from './components/CountryCard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WaveformPlayer from './components/WaveformPlayer';
import ToastContainer, { Toast } from './components/ToastContainer';
import { generateAfricanVoiceOverRaw } from './services/geminiService';
import { decodeRawPcm, audioBufferToWav } from './services/audioUtils';
import Pricing from './components/Pricing';
import Auth from './components/Auth';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';

const STORAGE_KEY = 'afrivoice_history_v1';
const MAX_HISTORY_ITEMS = 5;

const App: React.FC = () => {
  // Session & Profile State
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ plan_id: string; seconds_used: number } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'pricing'>('studio');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('AFRIVOICE_LANG') as Language) || 'fr');
  const isEn = language === 'en';

  // Core Application States
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [script, setScript] = useState<string>('');

  const [settings, setSettings] = useState<VoiceSettings>({
    gender: 'female',
    speed: 1.0,
  });

  const [status, setStatus] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    audioUrl: null,
  });

  // Audio & DOM Refs
  const voiceBufferRef = useRef<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auth Effect ---
  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('plan_id, seconds_used').eq('id', userId).single();
      if (data && !error) {
        setProfile(data);
      } else {
        // Fallback or retry logic if trigger hasn't finished
        setProfile({ plan_id: 'free', seconds_used: 0 });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => setIsAuthLoading(false));
      } else {
        setIsAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Theme Effect ---
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- History Loading ---
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  };

  const addToast = (type: Toast['type'], title: string, message: string) => {
    const newToast: Toast = { id: Date.now().toString(), type, title, message };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'fr' ? 'en' : 'fr';
    setLanguage(nextLang);
    localStorage.setItem('AFRIVOICE_LANG', nextLang);
    addToast('info', nextLang === 'fr' ? 'Langue : Français' : 'Language : English', nextLang === 'fr' ? 'L’interface est maintenant en français.' : 'Interface switched to English.');
  };

  // --- Generation Logic ---
  const handleGenerate = async () => {
    if (!session) {
      addToast('error', 'Erreur', 'Vous devez être connecté.');
      return;
    }

    if (!script.trim()) {
      setStatus((prev) => ({ ...prev, error: isEn ? 'Please enter your script.' : 'Veuillez entrer votre script de narration.' }));
      addToast('error', isEn ? 'Missing Script' : 'Script manquant', isEn ? 'The script field cannot be empty.' : 'Le champ de script vocal ne peut pas être vide.');
      return;
    }

    if (script.length > 5000) {
      setStatus((prev) => ({
        ...prev,
        error: isEn ? 'Character limit exceeded (max 5000).' : 'Limite de caractères dépassée (max 5000).',
      }));
      return;
    }

    setStatus({ isGenerating: true, error: null, audioUrl: null });
    voiceBufferRef.current = null;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      // Sélection de la voix en fonction du genre
      const selectedVoiceId = settings.gender === 'female' ? 'Aoede' : 'Puck';

      // Le paramètre de plan est supprimé ou fixé à 'pro' pour le bypass
      const rawAudio = await generateAfricanVoiceOverRaw(
        script,
        selectedCountry.name,
        selectedCountry.accentDescription,
        selectedVoiceId,
        settings,
        session.access_token 
      );

      const buffer = await decodeRawPcm(rawAudio, audioContextRef.current, 24000, 1);
      voiceBufferRef.current = buffer;

      const wavBlob = audioBufferToWav(buffer);
      const url = URL.createObjectURL(wavBlob);

      // Convert blob to base64 for history storage
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          country: selectedCountry,
          script,
          settings,
          audioData: base64data,
        };
        const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
        saveHistory(updatedHistory);
      };

      setStatus({ isGenerating: false, error: null, audioUrl: url });
      addToast('success', isEn ? 'Generation Complete' : 'Génération Terminée', isEn ? 'Your audio is ready to play.' : 'Votre audio est prêt à être écouté.');

    } catch (error: any) {
      console.error("Generation error:", error);
      let errorMessage = isEn ? 'An unknown error occurred.' : 'Erreur inconnue.';
      
      if (error.message?.includes('429')) {
        errorMessage = isEn ? 'API rate limit reached. Please wait 60 seconds.' : 'Cadence de génération trop rapide. Veuillez patienter 60 secondes (Anti-spam Google).';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setStatus({ isGenerating: false, error: errorMessage, audioUrl: null });
      addToast('error', 'Erreur', errorMessage);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setSelectedCountry(item.country);
    setScript(item.script);
    setSettings(item.settings);
    // On ne recharge pas l'URL directement car c'est du base64, on simule une création
    fetch(item.audioData)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setStatus({ isGenerating: false, error: null, audioUrl: url });
        setActiveTab('studio');
      });
  };

  const deleteHistoryItem = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    saveHistory(updatedHistory);
  };

  // --- Auth Guard ---
  if (isAuthLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0E0F15]' : 'bg-zinc-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4FF00]"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0E0F15] text-zinc-300' : 'bg-zinc-50 text-zinc-800'}`}>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <Header 
          theme={theme} 
          setTheme={setTheme} 
          onOpenMobileSidebar={() => {}} 
          language={language}
          toggleLanguage={toggleLanguage}
        />
        <Auth onSuccess={() => {}} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0E0F15] text-zinc-300' : 'bg-zinc-50 text-zinc-800'}`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <Sidebar 
        activeTab={activeTab as any} 
        onTabChange={setActiveTab as any} 
        isDark={theme === 'dark'}
        historyCount={history.length}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
        language={language}
        onLogout={handleLogout}
        currentPlanId={profile?.plan_id || 'free'}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header 
          theme={theme} 
          setTheme={setTheme} 
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)} 
          language={language}
          toggleLanguage={toggleLanguage}
        />

        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12 pb-24">
            
            {activeTab === 'studio' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
                <div className="mb-8">
                  <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-tight ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                    {isEn ? 'Create your ' : 'Créer votre '} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4FF00] to-[#84CC16]">Voix-Off</span>
                  </h1>
                  <p className="text-lg text-zinc-500 dark:text-zinc-400 mt-3 font-medium max-w-2xl">
                    {isEn ? 'Select an accent, type your text, and generate high-quality audio.' : 'Sélectionnez un accent, saisissez votre texte, et générez un audio de haute qualité.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                  {/* Left Column: Script & Country */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Country Grid */}
                    <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${theme === 'dark' ? 'bg-[#1A1D27] border-[#2E3341]' : 'bg-white border-[#E4E4E7]'}`}>
                      <h2 className={`text-xl font-bold mb-5 flex items-center gap-2 ${theme === 'dark' ? 'text-[#F1F3F5]' : 'text-zinc-900'}`}>
                        {isEn ? '1. Select Accent & Country' : '1. Choix de l\'Accent & Pays'}
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {COUNTRIES.map(country => (
                          <CountryCard
                            key={country.id}
                            country={country}
                            isSelected={selectedCountry.id === country.id}
                            onClick={() => setSelectedCountry(country)}
                            isDark={theme === 'dark'}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Script Editor */}
                    <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${theme === 'dark' ? 'bg-[#1A1D27] border-[#2E3341]' : 'bg-white border-[#E4E4E7]'}`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-[#F1F3F5]' : 'text-zinc-900'}`}>
                          {isEn ? '2. Script Editor' : '2. Éditeur de Script'}
                        </h2>
                      </div>
                      
                      <div className="relative group">
                        <textarea
                          value={script}
                          onChange={(e) => setScript(e.target.value)}
                          placeholder={isEn ? "Type or paste your text here..." : "Saisissez ou collez votre texte ici..."}
                          className={`w-full h-48 p-5 rounded-2xl border text-base sm:text-lg leading-relaxed resize-none transition-all duration-300 focus:ring-2 focus:ring-[#D4FF00] outline-none ${
                            theme === 'dark' 
                              ? 'bg-[#0F1117] border-[#3F3F46] text-white placeholder-zinc-600 focus:border-transparent' 
                              : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:bg-white'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Generate Button Area */}
                    <div className={`p-6 sm:p-8 rounded-3xl border shadow-lg ${theme === 'dark' ? 'bg-gradient-to-br from-[#1A1D27] to-[#0F1117] border-[#2E3341]' : 'bg-gradient-to-br from-white to-zinc-50 border-[#E4E4E7]'}`}>
                      
                      {status.error && (
                        <div className="mb-6 p-5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex gap-4 items-start shadow-sm animate-in slide-in-from-top-2">
                          <div className="mt-0.5 text-red-500">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-red-700 dark:text-red-400">{isEn ? 'Generation Error' : 'Erreur de génération'}</h3>
                            <p className="text-sm text-red-600/90 dark:text-red-300/90 mt-1 font-medium">{status.error}</p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleGenerate}
                        disabled={status.isGenerating || !script.trim()}
                        className={`w-full py-5 sm:py-6 rounded-2xl flex items-center justify-center gap-3 font-black text-lg sm:text-xl transition-all duration-300 relative overflow-hidden group shadow-xl ${
                          status.isGenerating || !script.trim()
                            ? theme === 'dark' 
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none border border-zinc-700' 
                              : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                            : 'bg-[#D4FF00] hover:bg-[#bce600] text-black hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#D4FF00]/20'
                        }`}
                      >
                        {status.isGenerating ? (
                          <>
                            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {isEn ? 'Synthesizing...' : 'Synthèse en cours...'}
                          </>
                        ) : (
                          <>
                            <svg className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            {isEn ? 'Generate Voice' : 'Générer la Voix-Off'}
                          </>
                        )}
                      </button>

                      {status.audioUrl && (
                        <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-white/10 animate-in slide-in-from-bottom-4">
                          <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
                            {isEn ? 'Final Result' : 'Résultat Final'}
                          </h3>
                          <WaveformPlayer audioUrl={status.audioUrl} isDark={theme === 'dark'} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Voice Settings */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm sticky top-6 ${theme === 'dark' ? 'bg-[#1A1D27] border-[#2E3341]' : 'bg-white border-[#E4E4E7]'}`}>
                      <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-[#F1F3F5]' : 'text-zinc-900'}`}>
                        {isEn ? '3. Voice Settings' : '3. Réglages Vocaux'}
                      </h2>
                      
                      <div className="space-y-8">
                        {/* Gender */}
                        <div>
                          <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest block mb-3">
                            {isEn ? 'Voice Type' : 'Type de Voix'}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {['female', 'male'].map((g) => (
                              <button
                                key={g}
                                onClick={() => setSettings(s => ({ ...s, gender: g as 'female' | 'male' }))}
                                className={`py-3.5 px-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 border ${
                                  settings.gender === g
                                    ? theme === 'dark'
                                      ? 'bg-zinc-800 border-zinc-700 text-white shadow-inner'
                                      : 'bg-zinc-100 border-zinc-300 text-zinc-900 shadow-inner'
                                    : theme === 'dark'
                                      ? 'bg-transparent border-[#2E3341] text-zinc-400 hover:border-zinc-500'
                                      : 'bg-transparent border-zinc-200 text-zinc-500 hover:border-zinc-300'
                                }`}
                              >
                                {g === 'female' ? (isEn ? '👩 Female' : '👩 Femme') : (isEn ? '👨 Male' : '👨 Homme')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Speed */}
                        <div>
                          <div className="flex justify-between mb-3">
                            <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest block">
                              {isEn ? 'Speaking Rate' : 'Vitesse'}
                            </label>
                            <span className={`text-sm font-black ${theme === 'dark' ? 'text-[#D4FF00]' : 'text-green-600'}`}>
                              {settings.speed}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={settings.speed}
                            onChange={(e) => setSettings(s => ({ ...s, speed: parseFloat(e.target.value) }))}
                            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${theme === 'dark' ? 'bg-[#2E3341] accent-[#D4FF00]' : 'bg-zinc-200 accent-black'}`}
                          />
                          <div className="flex justify-between text-[10px] sm:text-xs font-bold text-zinc-500 mt-2">
                            <span>{isEn ? 'Slow' : 'Lent'}</span>
                            <span>{isEn ? 'Normal' : 'Normal'}</span>
                            <span>{isEn ? 'Fast' : 'Rapide'}</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <h2 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                    {isEn ? 'Audio Library' : 'Bibliothèque Audio'}
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                    {isEn ? 'Your recent generated voice-overs.' : 'Vos récentes générations de voix-off.'}
                  </p>
                </div>
                
                {history.length === 0 ? (
                  <div className={`p-12 text-center rounded-3xl border border-dashed ${theme === 'dark' ? 'border-zinc-700 bg-zinc-800/30' : 'border-zinc-300 bg-zinc-50'}`}>
                    <p className="text-zinc-500 font-medium">
                      {isEn ? 'No audio generated yet.' : 'Aucun audio généré pour le moment.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {history.map((item) => (
                      <div key={item.id} className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border ${theme === 'dark' ? 'bg-[#1A1D27] border-[#2E3341]' : 'bg-white border-[#E4E4E7]'}`}>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <span className="text-3xl">{item.country.flag}</span>
                          <div>
                            <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                              {item.country.name} - {item.settings.gender === 'female' ? 'Femme' : 'Homme'}
                            </h4>
                            <p className="text-xs text-zinc-500 truncate max-w-[200px] sm:max-w-xs">
                              {item.script}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => loadHistoryItem(item)}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold bg-[#D4FF00] text-black hover:bg-[#bce600]"
                          >
                            {isEn ? 'Load' : 'Charger'}
                          </button>
                          <button
                            onClick={() => deleteHistoryItem(item.id)}
                            className={`px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${theme === 'dark' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                          >
                            {isEn ? 'Del' : 'Suppr'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <Pricing 
                currentPlanId={profile?.plan_id || 'free'}
                isDark={theme === 'dark'}
                language={language}
                onSubscribe={async (planId) => {
                  try {
                    const res = await fetch('/api/checkout', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                      },
                      body: JSON.stringify({ planId, email: session.user.email })
                    });
                    const data = await res.json();
                    if (data.authorizationUrl) {
                      window.location.href = data.authorizationUrl;
                    } else {
                      addToast('error', 'Erreur de paiement', "Impossible d'initialiser le paiement.");
                    }
                  } catch (e) {
                    addToast('error', 'Erreur', 'Erreur réseau.');
                  }
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
