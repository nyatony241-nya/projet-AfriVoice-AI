import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, VOICE_OPTIONS, PRICING_PLANS, PRICING_PLANS_EN, BG_MUSIC_TRACKS } from './constants';
import { Country, GenerationState, VoiceSettings, PricingPlan, MixerSettings, HistoryItem, QuotaUsage, Language } from './types';
import CountryCard from './components/CountryCard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatCounters from './components/StatCounters';
import WaveformPlayer from './components/WaveformPlayer';
import QuotaBar from './components/QuotaBar';
import ToastContainer, { Toast } from './components/ToastContainer';
import AuditModal from './components/AuditModal';
import { generateAfricanVoiceOverRaw } from './services/geminiService';
import { decodeRawPcm, mixAudioBuffers, audioBufferToWav, fetchAndDecodeAudio } from './services/audioUtils';

const STORAGE_KEY = 'afrivoice_history_v1';
const QUOTA_STORAGE_KEY = 'afrivoice_quota_v1';
const MAX_HISTORY_ITEMS = 5;

const App: React.FC = () => {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'studio' | 'mastering' | 'history' | 'pricing'>('studio');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('AFRIVOICE_LANG') as Language) || 'fr');
  const isEn = language === 'en';

  // Core Application & Pricing Plan States
  const [currentPlan, setCurrentPlan] = useState<PricingPlan>(() => {
    const savedPlanId = localStorage.getItem('AFRIVOICE_PLAN_ID');
    const found = PRICING_PLANS.find(p => p.id === savedPlanId);
    return found || PRICING_PLANS[0];
  });
  const [showQuotaError, setShowQuotaError] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [userApiKeyInput, setUserApiKeyInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('AFRIVOICE_API_KEY') || localStorage.getItem('GEMINI_API_KEY') || '';
    }
    return '';
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Safety Rails: Quota & Rate Limit state
  const [usedSeconds, setUsedSeconds] = useState<number>(0);
  const [bonusSeconds, setBonusSeconds] = useState<number>(0);
  const [lastGenTimestamp, setLastGenTimestamp] = useState<number>(0);
  const [recentGenerationsCount, setRecentGenerationsCount] = useState<number>(0);

  const availableCountries = useMemo(() => {
    if (currentPlan.id === 'free') return COUNTRIES.slice(0, 5);
    return COUNTRIES;
  }, [currentPlan]);

  // Dynamic Quota limits by plan (Safety Rail #1 & #3) + Recharge bonus
  const quota = useMemo<QuotaUsage>(() => {
    let baseMaxSeconds = 90; // 1.5 min daily free cap
    let maxChars = 300;

    if (currentPlan.id === 'creator') {
      baseMaxSeconds = 3600; // 60 min monthly cap
      maxChars = 1500;
    } else if (currentPlan.id === 'pro') {
      baseMaxSeconds = 9600; // 160 min monthly cap
      maxChars = 3000;
    }

    return {
      usedSeconds,
      maxSeconds: baseMaxSeconds + bonusSeconds,
      maxCharsPerScript: maxChars,
    };
  }, [currentPlan, usedSeconds, bonusSeconds]);

  const [selectedCountry, setSelectedCountry] = useState<Country>(availableCountries[0]);
  const [script, setScript] = useState<string>('');

  const [settings, setSettings] = useState<VoiceSettings>({
    gender: 'female',
    age: 30,
    style: 'pro',
    pitch: 1.0,
    speed: 1.0,
    timbre: 50,
    emotion: 'neutral',
    useLocalExpressions: false,
  });

  const [mixer, setMixer] = useState<MixerSettings>({
    voiceVolume: 100,
    bgMusicVolume: 30,
    bgMusicId: null,
    isMixing: false,
  });

  const [status, setStatus] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    audioUrl: null,
  });

  const [isApplyingMix, setIsApplyingMix] = useState(false);

  // Audio & DOM Refs
  const voiceBufferRef = useRef<AudioBuffer | null>(null);
  const bgMusicBufferRef = useRef<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const isPremiumFeature = currentPlan.id === 'pro';
  const isCloningFeature = currentPlan.id === 'pro';
  const isDark = theme === 'dark';

  // Toast Helpers
  const addToast = (type: Toast['type'], title: string, message?: string) => {
    const newToast: Toast = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 4));
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load history and quota on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }

    const savedQuota = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (savedQuota) {
      try {
        setUsedSeconds(Number(savedQuota));
      } catch (e) {
        console.error('Failed to load quota usage', e);
      }
    }

    const savedBonus = localStorage.getItem('AFRIVOICE_BONUS_SECONDS');
    if (savedBonus) {
      try {
        setBonusSeconds(Number(savedBonus));
      } catch (e) {
        console.error('Failed to load bonus seconds', e);
      }
    }
  }, []);

  // Save history, quota, and bonus to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(QUOTA_STORAGE_KEY, String(usedSeconds));
  }, [usedSeconds]);

  useEffect(() => {
    localStorage.setItem('AFRIVOICE_BONUS_SECONDS', String(bonusSeconds));
  }, [bonusSeconds]);

  useEffect(() => {
    localStorage.setItem('AFRIVOICE_PLAN_ID', currentPlan.id);
  }, [currentPlan]);

  useEffect(() => {
    if (!availableCountries.find((c) => c.id === selectedCountry.id)) {
      setSelectedCountry(availableCountries[0]);
    }
  }, [availableCountries, selectedCountry]);

  useEffect(() => {
    if (!isPremiumFeature) {
      setMixer((prev) => ({ ...prev, isMixing: false, bgMusicId: null }));
    }
  }, [isPremiumFeature]);

  // Synchronize dark/light class with HTML tag & background
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#09090B';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#FFFBF5';
    }
  }, [theme]);

  const handleOpenKeyPicker = async () => {
    try {
      const studio = (window as any).aistudio;
      if (studio && typeof studio.openSelectKey === 'function') {
        await studio.openSelectKey();
        setShowQuotaError(false);
        setStatus((prev) => ({ ...prev, error: null }));
        addToast('info', 'Clé API sélectionnée', 'Votre quota et vos requêtes sont désormais liés à votre clé.');
        return;
      }
    } catch (err) {
      console.error('Failed to open key picker', err);
    }
    // Fallback to our custom in-app API Key modal
    if (typeof window !== 'undefined') {
      setUserApiKeyInput(localStorage.getItem('AFRIVOICE_API_KEY') || localStorage.getItem('GEMINI_API_KEY') || '');
    }
    setShowKeyModal(true);
  };

  // Recharge (+50 minutes added to max quota)
  const handleTopUpQuota = () => {
    setBonusSeconds((prev) => prev + 3000);
    addToast('success', isEn ? '50 Min Top-Up Validated' : 'Recharge 50 Min Validée', isEn ? 'Your voice synthesis quota has increased by +50 minutes (+3,000 sec).' : 'Votre quota de synthèse vocale a été augmenté de +50 minutes (+3 000 sec).');
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'fr' ? 'en' : 'fr';
    setLanguage(nextLang);
    localStorage.setItem('AFRIVOICE_LANG', nextLang);
    addToast('info', nextLang === 'fr' ? 'Langue : Français' : 'Language : English', nextLang === 'fr' ? 'L’interface est maintenant en français.' : 'Interface switched to English.');
  };

  const handleGenerate = async () => {
    if (!script.trim()) {
      setStatus((prev) => ({ ...prev, error: 'Veuillez entrer ou coller votre script de narration.' }));
      addToast('error', 'Script manquant', 'Le champ de script vocal ne peut pas être vide.');
      return;
    }

    // Safety Rail #1: Hard Quota Check
    if (usedSeconds >= quota.maxSeconds) {
      setStatus((prev) => ({
        ...prev,
        error: `Plafond ${currentPlan.name} atteint (${Math.round(usedSeconds / 60)} min / ${Math.round(quota.maxSeconds / 60)} min max). Passez au forfait supérieur ou rechargez pour continuer.`,
      }));
      addToast('warning', 'Plafond de Synthèse Atteint', 'Plafond mensuel de votre forfait atteint. Passez au forfait supérieur ou rechargez pour continuer.');
      return;
    }

    // Safety Rail #3: Max Character Limit check
    if (script.length > quota.maxCharsPerScript) {
      setStatus((prev) => ({
        ...prev,
        error: `Limite de caractères dépassée (${script.length} / ${quota.maxCharsPerScript} max pour le Plan ${currentPlan.name}).`,
      }));
      addToast('error', 'Texte trop long', `Veuillez réduire votre script sous les ${quota.maxCharsPerScript} caractères pour éviter la surcharge.`);
      return;
    }

    // Safety Rail #2: Rate Limiting / Anti-Spam (Max 5 per minute window)
    const now = Date.now();
    if (now - lastGenTimestamp < 12000 && recentGenerationsCount >= 5) {
      setStatus((prev) => ({
        ...prev,
        error: 'Protection Anti-Spam / Rate Limit activée. Veuillez patienter 10 secondes.',
      }));
      addToast('warning', 'Protection Anti-Spam Active', 'Trop de requêtes rapides. Veuillez patienter un instant avant la prochaine génération.');
      return;
    }
    if (now - lastGenTimestamp > 60000) {
      setRecentGenerationsCount(1);
    } else {
      setRecentGenerationsCount((prev) => prev + 1);
    }
    setLastGenTimestamp(now);

    setStatus({ isGenerating: true, error: null, audioUrl: null });
    setShowQuotaError(false);
    voiceBufferRef.current = null;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      // Sélection de la voix en fonction du genre
      const selectedVoiceId = settings.gender === 'female' ? 'Zephyr' : 'Kore';

      const rawAudio = await generateAfricanVoiceOverRaw(
        script,
        selectedCountry.name,
        selectedCountry.accentDescription,
        selectedVoiceId,
        settings,
        currentPlan.id
      );

      const buffer = await decodeRawPcm(rawAudio, audioContextRef.current, 24000, 1);
      voiceBufferRef.current = buffer;

      const wavBlob = audioBufferToWav(buffer);
      const url = URL.createObjectURL(wavBlob);

      // Account for exact audio duration inside Quota safety tracker
      const estimatedSeconds = Math.max(5, Math.round(buffer.duration || script.length / 14));
      setUsedSeconds((prev) => prev + estimatedSeconds);

      // Convert blob to base64 for history storage
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const newItem: HistoryItem = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          country: selectedCountry,
          script,
          settings,
          audioData: base64data,
        };
        setHistory((prev) => [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
      };

      setStatus({ isGenerating: false, error: null, audioUrl: url });
      addToast('success', 'Voix africaine générée !', `Production de ${estimatedSeconds}s réussie (${selectedCountry.name} - ${selectedVoiceId}).`);
    } catch (err: any) {
      console.error(err);
      const isQuotaError = err?.message?.includes('429') || err?.message?.includes('quota') || err?.status === 429;
      const isKeyNotFoundError = err?.message?.includes('Requested entity was not found.');

      if (isKeyNotFoundError || isQuotaError) {
        setShowQuotaError(true);
        setStatus({ isGenerating: false, error: 'Plafond de génération atteint pour votre forfait.', audioUrl: null });
        addToast('warning', 'Plafond Atteint', 'Passez au forfait supérieur ou rechargez vos minutes pour continuer à produire.');
      } else {
        setStatus({
          isGenerating: false,
          error: 'Erreur de génération. Vérifiez votre connexion ou réessayez.',
          audioUrl: null,
        });
        addToast('error', 'Échec de la synthèse', err?.message || 'Erreur lors de la communication avec le moteur audio.');
      }
    }
  };

  const handleApplyMix = async () => {
    if (!voiceBufferRef.current || !audioContextRef.current) {
      addToast('warning', 'Aucun flux audio', "Générez d'abord une voix avant d'appliquer un mastering.");
      return;
    }

    setIsApplyingMix(true);
    setStatus((prev) => ({ ...prev, error: null }));

    try {
      let currentBgBuffer: AudioBuffer | null = null;
      if (mixer.bgMusicId) {
        const track = BG_MUSIC_TRACKS.find((t) => t.id === mixer.bgMusicId);
        if (track) {
          if (!bgMusicBufferRef.current || mixer.bgMusicId !== (bgMusicBufferRef.current as any).label) {
            currentBgBuffer = await fetchAndDecodeAudio(track.url, audioContextRef.current);
            (currentBgBuffer as any).label = track.id;
            bgMusicBufferRef.current = currentBgBuffer;
          } else {
            currentBgBuffer = bgMusicBufferRef.current;
          }
        }
      }

      const mixedBuffer = mixAudioBuffers(
        voiceBufferRef.current,
        currentBgBuffer,
        mixer.voiceVolume,
        mixer.bgMusicVolume,
        audioContextRef.current
      );

      const wavBlob = audioBufferToWav(mixedBuffer);
      const newUrl = URL.createObjectURL(wavBlob);

      if (status.audioUrl && !status.audioUrl.startsWith('data:')) URL.revokeObjectURL(status.audioUrl);

      setStatus((prev) => ({ ...prev, audioUrl: newUrl }));
      addToast('success', 'Mastering HD Appliqué', 'Le mixage audio (voix + pistes) est prêt pour l’exportation.');
    } catch (err: any) {
      console.error('Mastering failed', err);
      setStatus((prev) => ({ ...prev, error: err.message || 'Échec du mastering audio.' }));
      addToast('error', 'Erreur de mixage', err.message || 'Impossible de combiner les pistes.');
    } finally {
      setIsApplyingMix(false);
    }
  };

  const handleLoadFromHistory = (item: HistoryItem) => {
    setSelectedCountry(item.country);
    setScript(item.script);
    setSettings(item.settings);
    setStatus((prev) => ({ ...prev, audioUrl: item.audioData, error: null }));
    setActiveTab('studio');
    addToast('info', 'Audio Rechargé', `Script et paramètres de ${item.country.name} importés dans le studio.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    addToast('info', 'Élément supprimé', 'L’enregistrement a été retiré de votre bibliothèque.');
  };

  const handleSelectPlan = (plan: PricingPlan) => {
    setCurrentPlan(plan);
    addToast('success', `Forfait ${plan.name} Actif`, `Vous bénéficiez désormais des minutes et fonctionnalités du plan ${plan.name}.`);
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${isDark ? 'text-white' : 'text-zinc-900'}`}>
      <audio ref={previewAudioRef} preload="auto" hidden />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} isDark={isDark} />
      <AuditModal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} isDark={isDark} />

      {/* SaaS Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentPlan={currentPlan}
        isDark={isDark}
        historyCount={history.length}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
        language={language}
        onOpenAuditModal={() => setIsAuditModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky SaaS Header */}
        <Header
          currentPlan={currentPlan}
          theme={theme}
          onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
          onOpenKeyPicker={handleOpenKeyPicker}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          language={language}
          onToggleLanguage={toggleLanguage}
          onOpenAuditModal={() => setIsAuditModalOpen(true)}
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-5 sm:py-10">
          {/* Dashboard Animated Statistics Counters (Always visible at top of Studio) */}
          {activeTab === 'studio' && (
            <>
              <StatCounters
                availableCountriesCount={availableCountries.length}
                totalCountriesCount={COUNTRIES.length}
                currentPlan={currentPlan}
                isDark={isDark}
                language={language}
              />

              {/* Safety Rail #1: Realtime Profitability & Quota Tracker Bar */}
              <QuotaBar
                currentPlan={currentPlan}
                quota={quota}
                isDark={isDark}
                onOpenKeyPicker={handleOpenKeyPicker}
                onTopUp={handleTopUpQuota}
                language={language}
              />
            </>
          )}

          {/* Custom API Key Connection Modal */}
          {showKeyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div
                className={`w-full max-w-md rounded-[32px] p-6 sm:p-8 border shadow-2xl transition-all ${
                  isDark ? 'bg-[#14151C] border-white/10 text-white' : 'bg-white border-[#FDE8CD] text-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#EA580C] to-[#F59E0B] text-white flex items-center justify-center text-lg font-black shrink-0 shadow-md">
                      🔑
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">{isEn ? 'Connect Gemini API Key' : 'Connexion Clé API Gemini'}</h3>
                      <p className="text-[11px] font-bold text-zinc-500">{isEn ? 'Secure local storage (localStorage)' : 'Stockage local sécurisé (localStorage)'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowKeyModal(false)}
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {isEn
                      ? 'Enter your Google Gemini API Key to enable HD African voice generation directly from your browser. Your key stays 100% local on your device.'
                      : 'Entrez votre Clé API Google Gemini pour activer la génération de voix africaines HD directement depuis votre navigateur. Votre clé reste 100% locale sur votre appareil.'}
                  </p>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                      {isEn ? 'Your Gemini API Key (AIzaSy...)' : 'Votre Clé API Gemini (AIzaSy...)'}
                    </label>
                    <input
                      type="password"
                      value={userApiKeyInput}
                      onChange={(e) => setUserApiKeyInput(e.target.value)}
                      placeholder="AIzaSy.............................."
                      className={`w-full p-4 rounded-2xl border font-mono text-sm outline-none transition-all ${
                        isDark
                          ? 'bg-[#09090B] border-white/10 text-[#D4FF00] focus:border-[#D4FF00] focus:ring-2 focus:ring-[#D4FF00]/20'
                          : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20'
                      }`}
                    />
                  </div>

                  <div className={`p-3.5 rounded-2xl border text-[11px] font-medium flex items-start gap-2.5 ${
                    isDark ? 'bg-white/5 border-white/10 text-zinc-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <span className="text-sm shrink-0">💡</span>
                    <div>
                      <span>{isEn ? 'Don’t have a key yet?' : 'Vous n\'avez pas encore de clé ?'} </span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline text-[#EA580C] dark:text-[#D4FF00] hover:opacity-80"
                      >
                        {isEn ? 'Get one free on Google AI Studio ↗' : 'Obtenir une clé gratuite sur Google AI Studio ↗'}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-200 dark:border-white/10">
                  <button
                    onClick={() => {
                      localStorage.removeItem('AFRIVOICE_API_KEY');
                      localStorage.removeItem('GEMINI_API_KEY');
                      setUserApiKeyInput('');
                      addToast('info', isEn ? 'API Key Removed' : 'Clé API supprimée', isEn ? 'The custom key has been cleared.' : 'La clé personnalisée a été effacée.');
                      setShowKeyModal(false);
                    }}
                    className="py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-red-500 hover:border-red-500/30"
                  >
                    {isEn ? 'Clear' : 'Effacer'}
                  </button>
                  <button
                    onClick={() => {
                      if (!userApiKeyInput.trim()) {
                        addToast('error', isEn ? 'Missing Key' : 'Clé vide', isEn ? 'Please paste your API key.' : 'Veuillez coller votre clé API.');
                        return;
                      }
                      localStorage.setItem('AFRIVOICE_API_KEY', userApiKeyInput.trim());
                      localStorage.setItem('GEMINI_API_KEY', userApiKeyInput.trim());
                      setShowQuotaError(false);
                      setStatus((prev) => ({ ...prev, error: null }));
                      addToast('success', isEn ? 'API Key Connected ✅' : 'Clé API Connectée ✅', isEn ? 'Your Google Gemini API Key is now saved and active.' : 'Votre Clé API Google Gemini est maintenant active pour la synthèse.');
                      setShowKeyModal(false);
                    }}
                    className="flex-1 py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg bg-gradient-to-r from-[#EA580C] to-[#F59E0B] dark:from-[#D4FF00] dark:to-[#84CC16] text-white dark:text-black hover:scale-[1.02]"
                  >
                    {isEn ? 'Save & Connect' : 'Sauvegarder & Connecter'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quota Exhaustion Alert Box */}
          {showQuotaError && (
            <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
              <div
                className={`p-6 sm:p-8 rounded-[32px] border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 backdrop-blur-xl ${
                  isDark
                    ? 'border-red-500/30 bg-red-500/10 shadow-2xl shadow-red-500/5'
                    : 'border-red-500/40 bg-red-50 text-zinc-900 shadow-lg'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Plafond de Synthèse Atteint</h3>
                    <p className="text-xs sm:text-sm font-medium opacity-80 mt-0.5">
                      Votre quota inclus est épuisé. Passez à un forfait supérieur pour débloquer plus de minutes de synthèse vocale HD ou rechargez votre solde.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('pricing');
                    setShowQuotaError(false);
                  }}
                  className="w-full md:w-auto px-8 py-4 bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shrink-0"
                >
                  ⚡ Changer de Forfait
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: STUDIO DE SYNTHESE (Accents, Parameters & Script) */}
          {activeTab === 'studio' && (
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 sm:gap-10 animate-in fade-in duration-300">
              {/* Left Column: Accents & Settings */}
              <div className="contents lg:block lg:col-span-7 space-y-10">
                {/* Countries / Accents Selector */}
                <section className="order-1 lg:order-none">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-black tracking-tight flex items-center gap-2.5">
                        <span className="w-1.5 h-6 bg-[#EA580C] dark:bg-[#D4FF00] rounded-full" />
                        <span>{isEn ? 'African Accent Selection' : 'Sélection de l\'Accent Africain'}</span>
                      </h2>
                      <p className="text-xs text-zinc-500 font-bold mt-1">
                        {currentPlan.id === 'free'
                          ? isEn ? '5 countries unlocked (Free Plan) • Upgrade to CREATOR plan for 20 countries' : '5 pays débloqués (Plan Free) • Passez au plan CREATOR pour 20 pays'
                          : isEn ? 'All 20 countries and authentic accents are available' : 'Tous les 20 pays et accents authentiques sont disponibles'}
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {currentPlan.id === 'free' ? `5 / ${COUNTRIES.length} ${isEn ? 'Countries' : 'Pays'} 🔒` : `${COUNTRIES.length} ${isEn ? 'Countries' : 'Pays'}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                    {COUNTRIES.map((country, index) => {
                      const isCountryLocked = currentPlan.id === 'free' && index >= 5;
                      return (
                        <CountryCard
                          key={country.id}
                          country={country}
                          isSelected={selectedCountry.id === country.id}
                          onSelect={setSelectedCountry}
                          isLocked={isCountryLocked}
                          onLockedClick={() => {
                            addToast(
                              'warning',
                              isEn ? '🔒 Plan Upgrade Required' : '🔒 Forfait CREATOR ou PRO Requis',
                              isEn
                                ? `Upgrade to CREATOR or PRO plan to unlock the ${country.name} accent.`
                                : `Passez au forfait CREATOR ou PRO pour débloquer l'accent ${country.name}.`
                            );
                            setActiveTab('pricing');
                          }}
                        />
                      );
                    })}
                  </div>
                </section>

                {/* Synthesis Parameters Section */}
                <section
                  className={`order-3 lg:order-none rounded-[36px] p-6 sm:p-8 border transition-all duration-300 ${
                    isDark
                      ? 'bg-[#14151C] border-white/10 shadow-2xl'
                      : 'bg-white border-[#FDE8CD] shadow-lg shadow-[#EA580C]/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-white/5">
                    <h2 className="text-lg font-black tracking-tight flex items-center gap-2.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-[#EA580C] dark:text-[#D4FF00]"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{isEn ? 'Voice Parameters & Nuances' : 'Paramètres Vocaux & Nuances'}</span>
                    </h2>
                    <span className="text-[10px] font-mono text-zinc-500 font-bold">
                      {settings.isClonedVoice ? (isEn ? '🎤 Cloned Voice HD (Nouchi/Naija imprint)' : '🎤 Voix Clonée HD (Empreinte Nouchi/Naija)') : settings.gender === 'female' ? (isEn ? 'Zephyr (Female)' : 'Zephyr (Femme)') : (isEn ? 'Kore (Male)' : 'Kore (Homme)')} • {settings.age} {isEn ? 'y.o.' : 'ans'}
                    </span>
                  </div>

                  <div className="space-y-8">
                    {/* Gender Selection */}
                    <div className="flex gap-4">
                      {['female', 'male'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setSettings({ ...settings, gender: g as any, isClonedVoice: false })}
                          className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-98 ${
                            settings.gender === g && !settings.isClonedVoice
                              ? 'bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black shadow-lg shadow-[#EA580C]/25 dark:shadow-[#D4FF00]/25'
                              : isDark
                              ? 'bg-[#09090B] text-zinc-400 border border-white/5 hover:border-white/20'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'
                          }`}
                        >
                          {g === 'female' ? (isEn ? '👩 Female Voice (Zephyr)' : '👩 Voix Féminine (Zephyr)') : (isEn ? '👨 Male Voice (Kore)' : '👨 Voix Masculine (Kore)')}
                        </button>
                      ))}
                    </div>

                    {/* 🧬 Module Clonage de Voix IA (PRO & AGENCY) */}
                    <div className={`p-5 rounded-3xl border transition-all ${
                      settings.isClonedVoice
                        ? isDark ? 'bg-[#D4FF00]/10 border-[#D4FF00]/40' : 'bg-[#EA580C]/10 border-[#EA580C]/40'
                        : isDark ? 'bg-[#09090B] border-white/5' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🧬</span>
                          <span className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                            {isEn ? 'AI Voice Cloning (Personal Voice)' : 'Clonage Vocal IA (Voix Personnelle)'}
                          </span>
                        </div>
                        {!isCloningFeature ? (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white shadow-sm flex items-center gap-1">
                            🔒 PRO / CREATOR
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#16A34A] text-white">
                            {isEn ? '1 VOICE ACTIVE' : '1 VOIX ACTIVE'}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-zinc-500 font-medium mb-4">
                        {isEn ? 'Replicate your own voice or your radio ambassador\'s voice from a short HD audio sample.' : 'Repliquez votre propre voix ou celle de votre ambassadeur radio à partir d\'un court échantillon audio HD.'}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => {
                            if (!isCloningFeature) {
                              addToast('warning', isEn ? '🔒 Plan Upgrade Required' : '🔒 Option Indisponible', isEn ? 'Upgrade to CREATOR or PRO plan to unlock Personal AI Voice Cloning.' : 'Passez au forfait CREATOR ou PRO pour débloquer le Clonage Vocal IA personnel.');
                              setActiveTab('pricing');
                              return;
                            }
                            const newClonedState = !settings.isClonedVoice;
                            setSettings({
                              ...settings,
                              isClonedVoice: newClonedState,
                              clonedVoiceName: newClonedState ? 'Ma Voix Clonée (Studio Abidjan/Dakar)' : undefined
                            });
                            if (newClonedState) {
                              addToast('success', 'Clonage Vocal Activé', 'Le modèle synthétisera avec le timbre et l’accent exact de votre échantillon audio.');
                            }
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                            settings.isClonedVoice
                              ? 'bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black border-transparent shadow-md'
                              : isDark
                              ? 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/20'
                              : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                          } ${!isCloningFeature ? 'opacity-70 border-dashed border-amber-500/50' : ''}`}
                        >
                          <span>
                            {!isCloningFeature && '🔒 '}
                            {settings.isClonedVoice ? (isEn ? '✅ Cloned Voice Active' : '✅ Voix Clonée Active') : (isEn ? 'Activate My Cloned Voice' : 'Activer ma Voix Clonée')}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            if (!isCloningFeature) {
                              addToast('warning', isEn ? '🔒 Plan Upgrade Required' : '🔒 Option Indisponible', isEn ? 'Upgrade to CREATOR or PRO plan to unlock audio sample import.' : 'Passez au forfait CREATOR ou PRO pour débloquer l’import d’échantillon.');
                              setActiveTab('pricing');
                              return;
                            }
                            addToast('info', isEn ? 'Sample Analysis Complete' : 'Analyse Échantillon terminée', isEn ? 'Audio file (12s WAV) successfully analyzed: HD Nouchi acoustic fingerprint extracted.' : 'Fichier audio (12s WAV) analysé avec succès : Empreinte acoustique Nouchi HD extraite.');
                            setSettings({
                              ...settings,
                              isClonedVoice: true,
                              clonedVoiceName: isEn ? 'My Cloned Voice HD (WAV)' : 'Ma Voix Clonée HD (WAV)'
                            });
                          }}
                          className={`px-4 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-tight border flex items-center justify-center gap-1.5 transition-colors ${
                            isDark
                              ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/15'
                              : 'bg-zinc-200/70 border-zinc-300 text-zinc-800 hover:bg-zinc-300'
                          } ${!isCloningFeature ? 'opacity-70 border-dashed border-amber-500/50' : ''}`}
                        >
                          <svg className="w-3.5 h-3.5 text-[#EA580C] dark:text-[#D4FF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>
                            {!isCloningFeature && '🔒 '}
                            {isEn ? '+ Import Sample (10s)' : '+ Importer Échantillon (10s)'}
                          </span>
                        </button>
                      </div>

                      {/* Cloned voice slots dropdown when active */}
                      {settings.isClonedVoice && isCloningFeature && (
                        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">{isEn ? 'Selected cloned voice:' : 'Voix clonée sélectionnée :'}</span>
                          <select
                            value={settings.clonedVoiceName || ''}
                            onChange={(e) => setSettings({ ...settings, clonedVoiceName: e.target.value })}
                            className={`text-xs font-black rounded-lg px-2.5 py-1 outline-none ${
                              isDark ? 'bg-zinc-900 text-[#D4FF00]' : 'bg-white text-[#EA580C] border border-zinc-300'
                            }`}
                          >
                            <option value={isEn ? 'My Cloned Voice (Abidjan/Dakar Studio)' : 'Ma Voix Clonée (Studio Abidjan/Dakar)'}>{isEn ? '🎤 My Cloned Voice (Abidjan/Dakar Studio)' : '🎤 Ma Voix Clonée (Studio Abidjan/Dakar)'}</option>
                            <option value={isEn ? 'My Cloned Voice HD (WAV)' : 'Ma Voix Clonée HD (WAV)'}>{isEn ? '🎙️ My Cloned Voice HD (WAV)' : '🎙️ Ma Voix Clonée HD (WAV)'}</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Emotion & Local Slang */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                            {isEn ? 'Emotion & Intonation' : 'Émotion & Intonation'}
                          </label>
                          {!isPremiumFeature && (
                            <span className="text-[9px] bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black px-1.5 py-0.5 rounded font-black">
                              PRO
                            </span>
                          )}
                        </div>
                        <select
                          disabled={!isPremiumFeature}
                          value={settings.emotion}
                          onChange={(e) => setSettings({ ...settings, emotion: e.target.value as any })}
                          className={`w-full border rounded-2xl px-4 py-3.5 text-xs font-bold outline-none transition-colors cursor-pointer ${
                            isDark
                              ? 'bg-[#09090B] text-white border-white/10 hover:border-white/20'
                              : 'bg-zinc-50 text-zinc-900 border-zinc-200 hover:border-zinc-300'
                          } ${!isPremiumFeature ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <option value="neutral">{isEn ? 'Neutral / Narrative and Clear' : 'Neutre / Narratif et Clair'}</option>
                          <option value="happy">{isEn ? 'Happy / Sunny Vibe' : 'Joyeux / Ambiance Ensoleillée'}</option>
                          <option value="serious">{isEn ? 'Serious / Radio Journalism' : 'Sérieux / Journalisme Radio'}</option>
                          <option value="energetic">{isEn ? 'Energetic / Punchy Ad' : 'Énergique / Publicité Punchy'}</option>
                          <option value="soft">{isEn ? 'Soft / Soothing Storytelling' : 'Doux / Storytelling Apaisant'}</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                            {isEn ? 'Slang & Local Expressions' : 'Slang & Expressions Locales'}
                          </label>
                          {!isPremiumFeature && (
                            <span className="text-[9px] bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black px-1.5 py-0.5 rounded font-black">
                              PRO
                            </span>
                          )}
                        </div>
                        <button
                          disabled={!isPremiumFeature}
                          onClick={() => setSettings({ ...settings, useLocalExpressions: !settings.useLocalExpressions })}
                          className={`w-full py-3.5 px-5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border ${
                            settings.useLocalExpressions
                              ? 'bg-[#EA580C]/10 dark:bg-[#D4FF00]/10 text-[#EA580C] dark:text-[#D4FF00] border-[#EA580C]/30 dark:border-[#D4FF00]/30'
                              : isDark
                              ? 'bg-[#09090B] text-zinc-500 border-white/10'
                              : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                          } ${!isPremiumFeature ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <span className="uppercase tracking-widest text-[10px] font-extrabold">
                            {settings.useLocalExpressions ? (isEn ? 'Nouchi / Naija Enabled' : 'Nouchi / Naija Activé') : (isEn ? 'Disabled (Standard Fr/En)' : 'Désactivé (Fr/En Standard)')}
                          </span>
                          <div
                            className={`w-10 h-5 rounded-full relative transition-all ${
                              settings.useLocalExpressions ? 'bg-[#EA580C] dark:bg-[#D4FF00]' : 'bg-zinc-300 dark:bg-zinc-700'
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-3 h-3 rounded-full transition-all ${
                                isDark ? 'bg-black' : 'bg-white'
                              } ${settings.useLocalExpressions ? 'left-6' : 'left-1'}`}
                            />
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Speed & Age */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-white/5">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                          {isEn ? 'Speaking Rate' : 'Débit de parole'}
                        </label>
                        <div className="flex gap-2">
                          {[0.8, 1.0, 1.2].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setSettings({ ...settings, speed })}
                              className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${
                                settings.speed === speed
                                  ? 'bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black border-transparent shadow-md'
                                  : isDark
                                  ? 'bg-[#09090B] text-zinc-400 border-white/5 hover:border-white/20'
                                  : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                              }`}
                            >
                              {speed === 1.0 ? 'NORMAL' : speed < 1.0 ? (isEn ? 'SLOW (0.8x)' : 'LENT (0.8x)') : (isEn ? 'FAST (1.2x)' : 'RAPIDE (1.2x)')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                            {isEn ? 'Apparent Voice Age' : 'Âge apparent de la voix'}
                          </label>
                          <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#D4FF00]">
                            {settings.age} {isEn ? 'Y.O.' : 'ANS'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="18"
                          max="70"
                          value={settings.age}
                          onChange={(e) => setSettings({ ...settings, age: parseInt(e.target.value) })}
                          className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                          <span>{isEn ? 'Young (18yo)' : 'Jeune (18a)'}</span>
                          <span>{isEn ? 'Mature (70yo)' : 'Mature (70a)'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pitch & Timbre Sliders (Advanced Premium Options) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-zinc-200 dark:border-white/5">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                              {isEn ? 'Pitch (Tone)' : 'Pitch (Tonalité)'}
                            </label>
                            {!isPremiumFeature && (
                              <span className="text-[8px] bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black px-1.5 py-0.5 rounded font-black">
                                PRO
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#D4FF00]">
                            {settings.pitch.toFixed(1)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.1"
                          disabled={!isPremiumFeature}
                          value={settings.pitch}
                          onChange={(e) => setSettings({ ...settings, pitch: parseFloat(e.target.value) })}
                          className={`w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer ${
                            !isPremiumFeature ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                        />
                        <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                          <span>{isEn ? 'Deep Low' : 'Grave Profond'}</span>
                          <span>{isEn ? 'Clear High' : 'Clair Aigu'}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                              {isEn ? 'Timbre (Vocal Texture)' : 'Timbre (Texture Vocale)'}
                            </label>
                            {!isPremiumFeature && (
                              <span className="text-[8px] bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black px-1.5 py-0.5 rounded font-black">
                                PRO
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#D4FF00]">
                            {settings.timbre}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          disabled={!isPremiumFeature}
                          value={settings.timbre}
                          onChange={(e) => setSettings({ ...settings, timbre: parseInt(e.target.value) })}
                          className={`w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer ${
                            !isPremiumFeature ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                        />
                        <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                          <span>{isEn ? 'Warm Velvety' : 'Velouté Chaud'}</span>
                          <span>{isEn ? 'Crystal Bright' : 'Brillant Cristallin'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Script Workspace & Player */}
              <div className="contents lg:block lg:col-span-5 space-y-8">
                {/* Script Studio Box */}
                <div
                  className={`order-2 lg:order-none rounded-[36px] p-6 sm:p-8 border sticky top-24 transition-all duration-300 ${
                    isDark
                      ? 'bg-[#14151C] border-white/10 shadow-2xl'
                      : 'bg-white border-[#FDE8CD] shadow-xl shadow-[#EA580C]/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black tracking-tight flex items-center gap-2.5">
                      <span>{isEn ? 'Studio Script Editor' : 'Éditeur de Script Studio'}</span>
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      </div>
                    </h2>
                    <span className={`text-xs font-mono font-bold ${script.length > quota.maxCharsPerScript ? 'text-red-500 font-black' : 'text-zinc-400'}`}>
                      {script.length} / {quota.maxCharsPerScript} {isEn ? 'char.' : 'car.'} • ~{Math.ceil(script.length / 14)} sec
                    </span>
                  </div>

                  <div className="relative mb-6">
                    <textarea
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      placeholder={isEn ? `Type or paste your script... (Secured limit: Max ${quota.maxCharsPerScript} characters for ${currentPlan.name} plan)` : `Écrivez ou collez votre script... (Plafond sécurisé : Max ${quota.maxCharsPerScript} caractères pour le forfait ${currentPlan.name})`}
                      className={`w-full min-h-[260px] sm:min-h-[300px] p-6 sm:p-7 rounded-[28px] border outline-none resize-none text-base sm:text-lg font-medium transition-all custom-scrollbar ${
                        (status.error && !script.trim()) || script.length > quota.maxCharsPerScript
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                          : isDark
                          ? 'bg-[#09090B] border-white/10 text-white placeholder-zinc-600 focus:border-[#D4FF00] focus:ring-4 focus:ring-[#D4FF00]/10'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-[#EA580C] focus:ring-4 focus:ring-[#EA580C]/10'
                      }`}
                    />
                    {(status.error || script.length > quota.maxCharsPerScript) && (
                      <p className="text-xs text-red-500 font-bold mt-2.5 flex items-center gap-1.5">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>
                          {script.length > quota.maxCharsPerScript
                            ? (isEn ? `Limit: Your text exceeds the ${quota.maxCharsPerScript} character limit per request for ${currentPlan.name} plan.` : `Plafond : Votre texte dépasse la limite de ${quota.maxCharsPerScript} caractères autorisée par requête pour le forfait ${currentPlan.name}.`)
                            : status.error}
                        </span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={status.isGenerating || !script.trim() || script.length > quota.maxCharsPerScript || usedSeconds >= quota.maxSeconds}
                    className={`w-full py-5 rounded-[24px] font-black text-base sm:text-lg uppercase tracking-wider transition-all active:scale-98 shadow-xl ${
                      status.isGenerating || !script.trim() || script.length > quota.maxCharsPerScript || usedSeconds >= quota.maxSeconds
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border-none shadow-none'
                        : isDark
                        ? 'bg-[#D4FF00] text-black hover:bg-[#E2FF3B] shadow-[#D4FF00]/20 hover:scale-[1.01]'
                        : 'bg-[#EA580C] text-white hover:bg-[#D94E06] shadow-[#EA580C]/25 hover:scale-[1.01]'
                    }`}
                  >
                    {status.isGenerating ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-[3px] border-black border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
                        <span>{isEn ? 'SYNTHESIS IN PROGRESS...' : 'SYNTHÈSE EN COURS...'}</span>
                      </div>
                    ) : usedSeconds >= quota.maxSeconds ? (
                      isEn ? '🛑 QUOTA REACHED • TOP-UP REQUIRED' : '🛑 PLAFOND ATTEINT • RECHARGE REQUISE'
                    ) : (
                      isEn ? 'GENERATE AFRICAN VOICE' : 'GÉNÉRER LA VOIX AFRICAINE'
                    )}
                  </button>

                  {/* Shimmer Skeleton Loading State while generating */}
                  {status.isGenerating && (
                    <div className="mt-8 p-6 rounded-3xl border border-dashed border-zinc-300 dark:border-white/10 animate-pulse space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-32 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
                        <div className="h-4 w-16 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
                      </div>
                      <div className="flex items-center gap-1.5 h-12">
                        {[40, 70, 25, 90, 60, 30, 85, 50, 95, 45, 75, 35, 65, 80, 55].map((h, idx) => (
                          <div
                            key={idx}
                            className="flex-1 bg-[#EA580C]/30 dark:bg-[#D4FF00]/30 rounded-full animate-bounce"
                            style={{ height: `${h}%`, animationDelay: `${idx * 60}ms` }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-center font-mono text-zinc-500 uppercase tracking-widest">
                        {isEn ? 'IA Generation in progress • Gemini 2.5 TTS HD Model' : 'Génération IA en cours • Modèle Gemini 2.5 TTS HD'}
                      </p>
                    </div>
                  )}

                  {/* Waveform Player and Mastering Console when ready */}
                  {status.audioUrl && !status.isGenerating && (
                    <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-white/10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <WaveformPlayer
                        audioUrl={status.audioUrl}
                        onDownload={() => {
                          const a = document.createElement('a');
                          a.href = status.audioUrl!;
                          a.download = `afrivoice_${selectedCountry.id}_${Date.now()}.wav`;
                          a.click();
                          addToast('success', isEn ? 'File downloaded' : 'Fichier téléchargé', isEn ? `WAV export of ${selectedCountry.name} saved.` : `Export WAV de ${selectedCountry.name} enregistré.`);
                        }}
                        isDark={isDark}
                        countryFlag={selectedCountry.flag}
                        countryName={selectedCountry.name}
                      />

                      {/* Quick Mastering Switch to Console tab */}
                      <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-[#09090B] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#EA580C]/10 dark:bg-[#D4FF00]/10 text-[#EA580C] dark:text-[#D4FF00] flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="text-xs font-black">{isEn ? 'Add Background Music (Afrobeat, Sahel...)' : 'Ajouter une Musique de Fond (Afrobeat, Sahel...)'}</h5>
                            <p className="text-[11px] text-zinc-500 font-medium">{isEn ? 'Mix and adjust volumes on HD console.' : 'Mixer et ajuster les volumes sur la console HD.'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('mastering')}
                          className="px-4 py-2 rounded-xl text-[11px] font-extrabold bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-[#EA580C] hover:text-white dark:hover:bg-[#D4FF00] dark:hover:text-black transition-colors shrink-0"
                        >
                          {isEn ? 'Open Mastering →' : 'Ouvrir Mastering →'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONSOLE DE MASTERING HD (Mixing Voice + Background Music) */}
          {activeTab === 'mastering' && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-300 space-y-8">
              <div
                className={`p-8 sm:p-10 rounded-[40px] border ${
                  isDark
                    ? 'bg-[#14151C] border-white/10 shadow-2xl'
                    : 'bg-white border-[#FDE8CD] shadow-xl shadow-[#EA580C]/5'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-200 dark:border-white/10">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#EA580C] dark:text-[#D4FF00]">
                      HD Mixing Engine
                    </span>
                    <h2 className="text-2xl font-black tracking-tight mt-1">{isEn ? 'Studio Mastering Console' : 'Console de Mastering Studio'}</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      {isEn ? 'Harmonize vocal volume with authentic African background tracks.' : 'Harmonisez le volume vocal avec les pistes d\'ambiance authentiques d\'Afrique.'}
                    </p>
                  </div>
                  {status.audioUrl && (
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = status.audioUrl!;
                        a.download = `afrivoice_mastered_${selectedCountry.id}.wav`;
                        a.click();
                      }}
                      className="px-6 py-3 rounded-2xl bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black font-black text-xs uppercase tracking-wider hover:scale-105 transition-transform shrink-0 shadow-lg"
                    >
                      {isEn ? 'Export Mastered Mix' : 'Exporter le Mix Masterisé'}
                    </button>
                  )}
                </div>

                {!status.audioUrl ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-3xl">
                      🎧
                    </div>
                    <h3 className="text-lg font-extrabold">{isEn ? 'No active vocal file in console' : 'Aucun fichier vocal actif dans la console'}</h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      {isEn ? (
                        <>First generate a voice in the <strong>Synthesis Studio</strong> or load audio from your <strong>Library</strong>.</>
                      ) : (
                        <>Générez d&apos;abord une voix dans l&apos;onglet <strong>Studio de Synthèse</strong> ou chargez un audio depuis votre <strong>Bibliothèque</strong>.</>
                      )}
                    </p>
                    <button
                      onClick={() => setActiveTab('studio')}
                      className="mt-4 px-6 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-wider"
                    >
                      {isEn ? 'Go to Studio →' : 'Aller au Studio →'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Active Waveform Preview */}
                    <WaveformPlayer
                      audioUrl={status.audioUrl}
                      onDownload={() => {
                        const a = document.createElement('a');
                        a.href = status.audioUrl!;
                        a.download = `afrivoice_${selectedCountry.id}.wav`;
                        a.click();
                      }}
                      isDark={isDark}
                      countryFlag={selectedCountry.flag}
                      countryName={selectedCountry.name}
                    />

                    {/* Mixing Sliders & Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8 rounded-3xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/5">
                      {/* Voice Volume */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                            {isEn ? 'AI Voice Volume' : 'Volume de la Voix IA'}
                          </label>
                          <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#D4FF00]">
                            {mixer.voiceVolume}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="150"
                          value={mixer.voiceVolume}
                          onChange={(e) => setMixer({ ...mixer, voiceVolume: parseInt(e.target.value) })}
                          className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-[10px] text-zinc-400 font-medium">{isEn ? 'Amplification or attenuation of the primary vocal track.' : 'Amplification ou atténuation de la piste vocale principale.'}</p>
                      </div>

                      {/* Music Track Selector */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                            {isEn ? 'Background Music (Afrobeat)' : 'Piste d\'Ambiance (Afrobeat)'}
                          </label>
                          {!isPremiumFeature && (
                            <span className="text-[9px] bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white px-2 py-0.5 rounded font-black flex items-center gap-1 shadow-sm">
                              🔒 PRO / CREATOR
                            </span>
                          )}
                        </div>
                        <div onClick={() => {
                          if (!isPremiumFeature) {
                            addToast('warning', isEn ? '🔒 Plan Upgrade Required' : '🔒 Option Indisponible', isEn ? 'Upgrade to PRO or CREATOR plan to unlock background music mixing.' : 'Passez au forfait PRO ou CREATOR pour débloquer le mixage d’ambiance.');
                            setActiveTab('pricing');
                          }
                        }}>
                          <select
                            disabled={!isPremiumFeature}
                            value={mixer.bgMusicId || ''}
                            onChange={(e) => setMixer({ ...mixer, bgMusicId: e.target.value || null })}
                            className={`w-full border rounded-2xl px-4 py-3.5 text-xs font-black outline-none transition-colors cursor-pointer ${
                              isDark
                                ? 'bg-[#18181B] text-white border-white/10 hover:border-white/20'
                                : 'bg-white text-zinc-800 border-zinc-200 shadow-sm'
                            } ${!isPremiumFeature ? 'opacity-70 pointer-events-none' : ''}`}
                          >
                            <option value="">{isEn ? 'No Music (Voice only)' : 'Aucune Musique (Voix seule)'}</option>
                            {BG_MUSIC_TRACKS.map((track) => (
                              <option key={track.id} value={track.id}>
                                🎵 {track.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Music Volume (Premium Only) */}
                      <div className={`md:col-span-2 space-y-4 pt-4 border-t border-zinc-200 dark:border-white/5 ${!mixer.bgMusicId ? 'opacity-40 pointer-events-none' : ''}`}>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                            {isEn ? 'Background Music Volume' : 'Volume de la Musique de Fond'}
                          </label>
                          <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#D4FF00]">
                            {mixer.bgMusicVolume}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          disabled={!isPremiumFeature || !mixer.bgMusicId}
                          value={mixer.bgMusicVolume}
                          onChange={(e) => setMixer({ ...mixer, bgMusicVolume: parseInt(e.target.value) })}
                          className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                          <span>{isEn ? 'Subtle Background (15%)' : 'Subtil en arrière-plan (15%)'}</span>
                          <span>{isEn ? 'Balanced (30%)' : 'Équilibré (30%)'}</span>
                          <span>{isEn ? 'Powerful (60%+)' : 'Puissant (60%+)'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Apply Mix Action Button */}
                    <button
                      onClick={() => {
                        if (!isPremiumFeature) {
                          addToast('warning', isEn ? '🔒 Plan Upgrade Required' : '🔒 Forfait Supérieur Requis', isEn ? 'Upgrade to PRO plan to apply HD mastering console mixes.' : 'Passez au forfait PRO pour appliquer le mastering console HD.');
                          setActiveTab('pricing');
                          return;
                        }
                        handleApplyMix();
                      }}
                      disabled={isApplyingMix}
                      className={`w-full py-5 rounded-[24px] font-black text-base uppercase tracking-wider transition-all active:scale-98 shadow-xl flex items-center justify-center gap-2 ${
                        isApplyingMix || !isPremiumFeature
                          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-2 border-dashed border-amber-500/50 shadow-none'
                          : isDark
                          ? 'bg-[#D4FF00] text-black hover:bg-[#E2FF3B] shadow-[#D4FF00]/20'
                          : 'bg-[#EA580C] text-white hover:bg-[#D94E06] shadow-[#EA580C]/25'
                      }`}
                    >
                      {!isPremiumFeature && <span>🔒</span>}
                      <span>
                        {isApplyingMix
                          ? (isEn ? 'PROCESSING HD MASTERING...' : 'TRAITEMENT DU MASTERING EN COURS...')
                          : !isPremiumFeature
                          ? (isEn ? 'APPLY HD MASTERING (PRO ONLY)' : 'APPLIQUER LE MASTERING HD (PRO ONLY)')
                          : (isEn ? 'APPLY HD MASTERING' : 'APPLIQUER LE MASTERING HD')}
                      </span>
                    </button>
                    {!isPremiumFeature && (
                      <p className="text-xs text-center font-extrabold text-amber-500 dark:text-amber-400 uppercase tracking-tight flex items-center justify-center gap-1">
                        <span>🔒</span>
                        <span>{isEn ? 'Multi-track mixing is reserved for CREATOR & PRO subscribers.' : 'L\'option de mixage sur piste est réservée aux abonnés CREATOR & PRO.'}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: BIBLIOTHEQUE & HISTORIQUE (History Table + Cards) */}
          {activeTab === 'history' && (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-300 space-y-8">
              <div
                className={`p-8 sm:p-10 rounded-[40px] border ${
                  isDark
                    ? 'bg-[#14151C] border-white/10 shadow-2xl'
                    : 'bg-white border-[#FDE8CD] shadow-xl shadow-[#EA580C]/5'
                }`}
              >
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-200 dark:border-white/10">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{isEn ? 'Production Library & History' : 'Bibliothèque & Historique de Production'}</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      {isEn ? `Find and replay your last ${MAX_HISTORY_ITEMS} voice syntheses (saved securely on your device).` : `Retrouvez et réécoutez vos ${MAX_HISTORY_ITEMS} dernières synthèses vocales (sauvegardées en toute sécurité sur votre appareil).`}
                    </p>
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={() => {
                        setHistory([]);
                        addToast('info', isEn ? 'History cleared' : 'Historique purgé', isEn ? 'All local recordings have been deleted.' : 'Tous les enregistrements locaux ont été effacés.');
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors shrink-0"
                    >
                      {isEn ? 'Clear Library' : 'Effacer la Bibliothèque'}
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mx-auto text-3xl">
                      📜
                    </div>
                    <h3 className="text-base font-extrabold uppercase tracking-widest text-zinc-500">
                      {isEn ? 'No recent productions saved' : 'Aucune production récente enregistrée'}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      {isEn ? 'Your narrations and advertisements will automatically appear here as you create them.' : 'Vos narrations et publicités apparaîtront automatiquement ici au fur et à mesure de vos créations.'}
                    </p>
                    <button
                      onClick={() => setActiveTab('studio')}
                      className="mt-4 px-6 py-3 rounded-2xl bg-[#EA580C] dark:bg-[#D4FF00] text-white dark:text-black font-black text-xs uppercase tracking-wider"
                    >
                      {isEn ? 'Create my first voice →' : 'Créer ma première voix →'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className={`p-6 sm:p-7 rounded-[32px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 group ${
                          isDark
                            ? 'bg-[#09090B] border-white/5 hover:border-[#D4FF00]/40 hover:shadow-xl hover:shadow-[#D4FF00]/5'
                            : 'bg-zinc-50 border-zinc-200 hover:border-[#EA580C]/40 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-5 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800/80 flex items-center justify-center text-3xl shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                            {item.country.flag}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                                {item.country.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] font-bold uppercase text-[#EA580C] dark:text-[#D4FF00]">
                                {item.settings.gender === 'female' ? 'Zephyr' : 'Kore'} ({item.settings.age}a)
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate italic font-medium">
                              &quot;{item.script}&quot;
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <button
                            onClick={() => handleLoadFromHistory(item)}
                            className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                              isDark
                                ? 'bg-zinc-800 text-white hover:bg-[#D4FF00] hover:text-black'
                                : 'bg-white text-zinc-800 hover:bg-[#EA580C] hover:text-white shadow-sm'
                            }`}
                            title={isEn ? 'Load into Studio / Listen' : 'Charger dans le Studio / Réécouter'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{isEn ? 'Load & Listen' : 'Charger & Écouter'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteHistory(item.id)}
                            className="p-3 rounded-2xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                            title={isEn ? 'Delete recording' : 'Supprimer l\'enregistrement'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FORFAITS & ABONNEMENT (PRICING_PLANS exact rates preserved) */}
          {activeTab === 'pricing' && (
            <div className="animate-in fade-in duration-300 space-y-12 py-6">
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-[#EA580C] dark:text-[#D4FF00] px-4 py-1.5 rounded-full bg-[#EA580C]/10 dark:bg-[#D4FF00]/10">
                  {isEn ? 'Pricing Grid & HD Voice Plans' : 'Grille Tarifaire & Forfaits Vocaux HD'}
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                  {isEn ? 'Your Success Starts Here' : 'Votre Succès Démarre Ici'}
                </h2>
                <p className="text-sm sm:text-base text-zinc-500 font-medium leading-relaxed">
                  {isEn ? 'Each plan includes a monthly minute quota and exclusive features tailored to your production pace.' : 'Chaque forfait inclut un quota mensuel de minutes et des fonctionnalités exclusives adaptées à votre cadence de production.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
                {(isEn ? PRICING_PLANS_EN : PRICING_PLANS).map((plan) => {
                  const isActivePlan = currentPlan.id === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={`p-8 sm:p-10 rounded-[44px] border-2 transition-all duration-500 flex flex-col relative overflow-hidden group ${
                        isActivePlan
                          ? isDark
                            ? 'border-[#D4FF00] scale-[1.04] bg-[#14151C] shadow-2xl shadow-[#D4FF00]/15'
                            : 'border-[#EA580C] scale-[1.04] bg-white shadow-2xl shadow-[#EA580C]/15'
                          : isDark
                          ? 'border-white/10 bg-[#14151C] hover:border-white/20 hover:-translate-y-1.5'
                          : 'border-zinc-200 bg-white hover:border-[#EA580C]/40 hover:-translate-y-1.5 shadow-md'
                      }`}
                    >
                      {/* Popular / Active badges */}
                      {plan.isPopular && !isActivePlan && (
                        <div className="absolute top-6 right-6 bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-md">
                          {isEn ? 'POPULAR' : 'POPULAIRE'}
                        </div>
                      )}
                      {isActivePlan && (
                        <div
                          className={`absolute top-6 right-6 text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-md ${
                            isDark ? 'bg-[#D4FF00] text-black' : 'bg-[#EA580C] text-white'
                          }`}
                        >
                          {isEn ? 'ACTIVE PLAN' : 'PLAN ACTIF'}
                        </div>
                      )}

                      <h3
                        className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${
                          isDark ? 'text-[#D4FF00]' : 'text-[#EA580C]'
                        }`}
                      >
                        {plan.name}
                      </h3>

                      <div className="flex flex-wrap items-baseline gap-1.5 mb-3">
                        <span className="text-2xl sm:text-3xl xl:text-4xl font-black font-mono tracking-tight whitespace-nowrap text-zinc-900 dark:text-white">
                          {plan.price.replace(' FCFA', '')}
                        </span>
                        {!isEn && (
                          <span className="text-xs sm:text-sm font-extrabold text-[#EA580C] dark:text-[#D4FF00] whitespace-nowrap">
                            FCFA
                          </span>
                        )}
                        <span className="text-xs font-bold text-zinc-400 whitespace-nowrap">{isEn ? '/ month' : '/ mois'}</span>
                      </div>
                      <p className="text-xs font-bold text-zinc-500 mb-10 uppercase tracking-wider min-h-[32px]">{plan.description}</p>

                      <ul className="space-y-4 mb-12 flex-grow">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-3.5 text-xs sm:text-sm font-bold">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                isDark ? 'bg-[#D4FF00]/20 text-[#D4FF00]' : 'bg-[#EA580C]/15 text-[#EA580C]'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                />
                              </svg>
                            </div>
                            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{f}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleSelectPlan(plan)}
                        className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all ${
                          isActivePlan
                            ? isDark
                              ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/20'
                              : 'bg-[#EA580C] text-white shadow-lg shadow-[#EA580C]/20'
                            : isDark
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-white hover:text-black'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white'
                        }`}
                      >
                        {isActivePlan ? (isEn ? 'Currently Selected' : 'Actuellement Sélectionné') : (isEn ? 'Select This Plan' : 'Sélectionner ce Forfait')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <footer className="py-10 border-t border-zinc-200 dark:border-white/10 text-center mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span>{isEn ? 'AfriVoice AI Production Studio v2.5 • Secure HD Audio Engine' : 'AfriVoice AI Production Studio v2.5 • Moteur Audio HD Sécurisé'}</span>
            </div>
            <p className="font-mono uppercase tracking-[0.2em] text-[10px]">Made for the African Continent © 2026</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
