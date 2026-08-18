import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { COUNTRIES, VOICE_OPTIONS, PRICING_PLANS, PRICING_PLANS_EN, BG_MUSIC_TRACKS } from './constants';
import { Country, GenerationState, VoiceSettings, PricingPlan, MixerSettings, HistoryItem, QuotaUsage, Language, AccentLevel, ContentStyle, VocalPersonality, VocalObjective, QualityScore } from './types';
import { analyzeQuality } from './services/qualityAnalyzer';
import CountryCard from './components/CountryCard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatCounters from './components/StatCounters';
import WaveformPlayer from './components/WaveformPlayer';
import QuotaBar from './components/QuotaBar';
import ToastContainer, { Toast } from './components/ToastContainer';
import AuditModal from './components/AuditModal';
import { generateVoiceOver } from './services/geminiService';
import { mixAudioBuffers, audioBufferToWav, fetchAndDecodeAudio } from './services/audioUtils';
import { supabase } from './services/supabaseClient';
import AuthPage from './components/AuthPage';
import InstallAppModal from './components/InstallAppModal';
import RechargeModal, { QuotaPack, QUOTA_PACKS } from './components/RechargeModal';
import { triggerCelebration } from './components/ConfettiHelper';
import PaymentModal from './components/PaymentModal';
import { redirectToChariowCheckout } from './services/chariowService';

const STORAGE_KEY = 'afrivoice_history_v1';
const QUOTA_STORAGE_KEY = 'afrivoice_quota_v1';
const MAX_HISTORY_ITEMS = 5;

const App: React.FC = () => {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'pricing'>('studio');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('AFRIVOICE_LANG') as Language) || 'fr');
  const isEn = language === 'en';
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PricingPlan | null>(null);

  // Handle payment return from Chariow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const itemId = urlParams.get('item') || urlParams.get('plan') || urlParams.get('pack');

    if (paymentStatus === 'success') {
      if (itemId) {
        // Détecter si c'est un forfait
        const foundPlan = PRICING_PLANS.find((p) => p.id === itemId);
        if (foundPlan) {
          setCurrentPlan(foundPlan);
          setUsedSeconds(0);
          addToast(
            'success',
            isEn ? 'Plan Activated!' : 'Forfait Activé !',
            isEn ? `Your ${foundPlan.name} plan is now active.` : `Votre forfait ${foundPlan.name} est maintenant actif sur votre compte.`
          );
        } else {
          // Détecter si c'est un pack de recharge
          const foundPack = QUOTA_PACKS.find((p) => p.id === itemId);
          if (foundPack) {
            setBonusSeconds((prev) => prev + foundPack.seconds);
            addToast(
              'success',
              isEn ? `${foundPack.minutes} Min Top-Up Validated!` : `Recharge +${foundPack.minutes} Min Validée !`,
              isEn
                ? `Added +${foundPack.minutes} minutes (+${foundPack.seconds.toLocaleString()} sec) to your balance.`
                : `Votre quota de synthèse vocal a été augmenté de +${foundPack.minutes} minutes (+${foundPack.seconds.toLocaleString()} sec).`
            );
          } else {
            addToast(
              'success',
              isEn ? 'Payment Confirmed!' : 'Paiement Confirmé !',
              isEn ? 'Your Chariow purchase was validated.' : 'Votre achat via Chariow a été validé avec succès.'
            );
          }
        }
      } else {
        addToast(
          'success',
          isEn ? 'Payment Confirmed!' : 'Paiement Confirmé !',
          isEn ? 'Your Chariow payment was successful.' : 'Votre paiement via Chariow a été validé avec succès.'
        );
      }
      triggerCelebration();
      // Nettoyage propre des paramètres de l'URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancel') {
      addToast(
        'info',
        isEn ? 'Payment Cancelled' : 'Paiement Annulé',
        isEn ? 'You can finalize your payment anytime.' : 'Vous pouvez finaliser votre paiement à tout moment.'
      );
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleTriggerPWAInstall = async () => {
    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          addToast('success', isEn ? 'App Installed!' : 'Application Installée !', isEn ? 'AfriVoice AI is now installed on your device.' : 'AfriVoice AI est maintenant installée sur votre appareil.');
          setDeferredInstallPrompt(null);
        }
      } catch (err) {
        setIsInstallModalOpen(true);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

  // Core Application & Pricing Plan States
  const [currentPlan, setCurrentPlan] = useState<PricingPlan>(() => {
    const savedPlanId = localStorage.getItem('AFRIVOICE_PLAN_ID');
    const found = PRICING_PLANS.find(p => p.id === savedPlanId);
    return found || PRICING_PLANS[0];
  });
  const [showQuotaError, setShowQuotaError] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Safety Rails: Quota & Rate Limit state
  const [usedSeconds, setUsedSeconds] = useState<number>(0);
  const [bonusSeconds, setBonusSeconds] = useState<number>(0);
  const [lastGenTimestamp, setLastGenTimestamp] = useState<number>(0);
  const [recentGenerationsCount, setRecentGenerationsCount] = useState<number>(0);



  // Auth State
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const availableCountries = useMemo(() => {
    if (currentPlan.id === 'free') return COUNTRIES.slice(0, 5);
    return COUNTRIES;
  }, [currentPlan]);

  // Dynamic Quota limits by plan (Safety Rail #1 & #3) + Recharge bonus
  const quota = useMemo<QuotaUsage>(() => {
    let baseMaxSeconds = 600; // Starter: 10 min
    let maxChars = 500;

    if (currentPlan.id === 'creator') {
      baseMaxSeconds = 1800; // Creator: 30 min
      maxChars = 1500;
    } else if (currentPlan.id === 'pro') {
      baseMaxSeconds = 3600; // Pro: 60 min
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

  const [settings, setSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('AFRIVOICE_PREFS');
    const defaults: VoiceSettings = {
      gender: 'female',
      voiceVariant: 'voice1',
      age: 28,
      style: 'pro',
      pitch: 1.0,
      speed: 1.0,
      emotion: 'neutral',
      useLocalExpressions: false,
      phoneticHumanizer: true,
      accentLevel: 'medium',
      contentStyle: undefined,
      personality: undefined,
      vocalObjective: undefined,
    };

    if (saved) { try { return { ...defaults, ...JSON.parse(saved) }; } catch { /* ignore */ } }
    return defaults;
  });

  // Save user preferences (Memory feature)
  useEffect(() => {
    localStorage.setItem('AFRIVOICE_PREFS', JSON.stringify(settings));
  }, [settings]);


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

  // ── 3 Variants System ──────────────────────────────
  const [variants, setVariants] = useState<{ label: string; audioUrl: string; emotion: string }[]>([]);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [playingVariant, setPlayingVariant] = useState<number | null>(null);

  const playVariant = (url: string, idx: number) => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (playingVariant === idx) {
      audio.pause();
      setPlayingVariant(null);
    } else {
      audio.src = url;
      audio.play().catch(() => {});
      setPlayingVariant(idx);
      audio.onended = () => setPlayingVariant(null);
    }
  };

  // Audio & DOM Refs
  const voiceBufferRef = useRef<AudioBuffer | null>(null);
  const bgMusicBufferRef = useRef<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const isPremiumFeature = currentPlan.id === 'pro';
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

    // Check active session and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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

  useEffect(() => {
    if (currentPlan.id === 'free') {
      setSettings((prev) => ({ ...prev, useLocalExpressions: false, phoneticHumanizer: false }));
    }
  }, [currentPlan]);

  // Synchronize dark/light class with HTML tag & background
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#09090B';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#FAFAFA';
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
      }
    } catch (err) {
      console.error('Failed to open key picker', err);
    }
  };

  // Recharge : Ouvre la modal des 3 catégories de quota au choix de l'utilisateur
  const handleTopUpQuota = () => {
    setShowRechargeModal(true);
  };

  const handleSelectQuotaPack = (pack: QuotaPack) => {
    setShowRechargeModal(false);
    addToast(
      'info',
      isEn ? 'Redirecting to Chariow...' : 'Redirection vers Chariow...',
      isEn ? 'Opening secure checkout for mobile money & card payment...' : 'Ouverture du paiement sécurisé par Mobile Money & Carte...'
    );
    setTimeout(() => {
      redirectToChariowCheckout(pack.id, session?.user?.email || '');
    }, 400);
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'fr' ? 'en' : 'fr';
    setLanguage(nextLang);
    localStorage.setItem('AFRIVOICE_LANG', nextLang);
    addToast('info', nextLang === 'fr' ? 'Langue : Français' : 'Language : English', nextLang === 'fr' ? 'L’interface est maintenant en français.' : 'Interface switched to English.');
  };

  // ── 3 Variants Handler ──────────────────────────────
  const handleGenerateVariants = async () => {
    if (!script.trim() || status.isGenerating || isGeneratingVariants) return;
    if (usedSeconds >= quota.maxSeconds) {
      setShowRechargeModal(true);
      addToast('warning', isEn ? 'Quota Exhausted' : 'Quota épuisé', isEn ? 'Please recharge to continue.' : 'Veuillez recharger pour continuer.');
      return;
    }
    setIsGeneratingVariants(true);
    // Révoquer les anciennes URLs pour éviter les fuites mémoire
    variants.forEach(v => { if (v.audioUrl) URL.revokeObjectURL(v.audioUrl); });
    setVariants([]);
    addToast('info', isEn ? '3 Variants Mode' : 'Mode 3 Variantes', isEn ? 'Generating 3 emotion variants...' : 'Génération de 3 variantes émotionnelles...');

    const variantConfigs = [
      { label: 'Version A', emotion: 'happy' as const, description: isEn ? 'Warm & Friendly' : 'Chaleureuse' },
      { label: 'Version B', emotion: 'serious' as const, description: isEn ? 'Professional & Confident' : 'Professionnelle' },
      { label: 'Version C', emotion: 'energetic' as const, description: isEn ? 'Dynamic & Punchy' : 'Dynamique' },
    ];

    const selectedVoiceId = settings.gender === 'female'
      ? (selectedCountry.geminiVoiceFemale || 'Aoede')
      : (selectedCountry.geminiVoiceMale || 'Puck');

    const results: { label: string; audioUrl: string; emotion: string }[] = [];

    for (const variant of variantConfigs) {
      try {
        const result = await generateVoiceOver(script, selectedVoiceId, {
          countryId: selectedCountry.id,
          countryName: selectedCountry.name,
          accentDescription: selectedCountry.accentDescription,
          gender: settings.gender,
          voiceVariant: settings.voiceVariant || 'voice1',
          age: settings.age,
          emotion: variant.emotion,
          style: settings.style,
          useLocalExpressions: currentPlan.id === 'free' ? false : settings.useLocalExpressions,
          phoneticHumanizer: currentPlan.id === 'free' ? false : settings.phoneticHumanizer,
          speed: settings.speed,
          pitch: settings.pitch,
          accentLevel: settings.accentLevel,
          contentStyle: settings.contentStyle,
          personality: settings.personality,
          vocalObjective: settings.vocalObjective,
        });
        const url = URL.createObjectURL(result.blob);
        results.push({ label: `${variant.label} — ${variant.description}`, audioUrl: url, emotion: variant.emotion });
        // Update quota
        const estimatedSeconds = Math.max(3, Math.round(script.length / 14));
        setUsedSeconds((prev) => prev + estimatedSeconds);
      } catch (err: any) {
        results.push({ label: `${variant.label} — ❌ ${isEn ? 'Error' : 'Erreur'}`, audioUrl: '', emotion: variant.emotion });
      }
    }

    setVariants(results);
    setIsGeneratingVariants(false);
    addToast('success', isEn ? '3 variants ready!' : '3 variantes prêtes !', isEn ? 'Compare versions A, B, C below.' : 'Comparez les versions A, B, C ci-dessous.');
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
        error: isEn
          ? `Quota for ${currentPlan.name} exhausted. Please recharge or upgrade.`
          : `Plafond ${currentPlan.name} atteint. Veuillez recharger ou passer au forfait supérieur.`,
      }));
      setShowRechargeModal(true);
      addToast('warning', isEn ? 'Quota Exhausted' : 'Plafond de Synthèse Atteint', isEn ? 'Please recharge your account to continue.' : 'Votre quota est épuisé. Veuillez recharger pour continuer.');
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

    // Safety Rail #2: Rate Limiting / Anti-Spam (Max 10 per minute window)
    const now = Date.now();
    if (now - lastGenTimestamp < 3000 && recentGenerationsCount >= 10) {
      setStatus((prev) => ({
        ...prev,
        error: 'Protection Anti-Spam active. Veuillez patienter 3 secondes.',
      }));
      addToast('warning', 'Protection Anti-Spam Active', 'Veuillez patienter 3 secondes avant la prochaine génération.');
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

      const selectedVoiceId = settings.gender === 'female' 
        ? (selectedCountry.geminiVoiceFemale || 'Aoede') 
        : (selectedCountry.geminiVoiceMale || 'Puck');

      const result = await generateVoiceOver(script, selectedVoiceId, {
        countryId: selectedCountry.id,
        countryName: selectedCountry.name,
        accentDescription: selectedCountry.accentDescription,
        gender: settings.gender,
        voiceVariant: settings.voiceVariant || 'voice1',
        age: settings.age,
        emotion: settings.emotion,
        style: settings.style,
        useLocalExpressions: currentPlan.id === 'free' ? false : settings.useLocalExpressions,
        phoneticHumanizer: currentPlan.id === 'free' ? false : settings.phoneticHumanizer,
        speed: settings.speed,
        pitch: settings.pitch,
        accentLevel: settings.accentLevel,
        contentStyle: settings.contentStyle,
        personality: settings.personality,
        vocalObjective: settings.vocalObjective,
      });

      let buffer: AudioBuffer;

      if (result.float32Samples.length > 0) {
        // PCM L16 de Gemini TTS → AudioBuffer créé directement (sans decodeAudioData)
        const ctx = audioContextRef.current;
        buffer = ctx.createBuffer(1, result.float32Samples.length, result.sampleRate);
        buffer.copyToChannel(result.float32Samples, 0);
      } else {
        // Fallback pour formats déjà encodés
        const arrayBuffer = await result.blob.arrayBuffer();
        buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      }

      voiceBufferRef.current = buffer;

      const url = URL.createObjectURL(result.blob);

      // Account for exact audio duration inside Quota safety tracker
      const estimatedSeconds = Math.max(5, Math.round(buffer.duration || script.length / 14));
      setUsedSeconds((prev) => prev + estimatedSeconds);



      // Convert blob to base64 for history storage
      const reader = new FileReader();
      reader.readAsDataURL(result.blob);
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

      // Quality Analyzer — post-generation score
      const qScore = analyzeQuality(
        script,
        selectedCountry.id,
        settings.accentLevel || 'medium',
        settings.contentStyle || 'narration',
        settings.emotion || 'neutral',
        estimatedSeconds
      );
      triggerCelebration();
      setStatus({ isGenerating: false, error: null, audioUrl: url, qualityScore: qScore });
      addToast('success', isEn ? 'African voice generated!' : 'Voix africaine générée !', `Production de ${estimatedSeconds}s réussie (${selectedCountry.name} — Score: ${qScore.overall}/100).`);
    } catch (err: any) {
      console.error('Erreur lors de la génération vocale:', err?.message || 'Erreur inconnue');
      const isQuotaError = err?.message?.includes('429') || err?.message?.includes('quota') || err?.status === 429;

      if (isQuotaError) {
        setShowQuotaError(true);
        setStatus({ isGenerating: false, error: 'Cadence de génération élevée.', audioUrl: null });
        addToast('warning', 'Cadence de génération élevée', 'Veuillez patienter quelques secondes avant de relancer une nouvelle génération.');
      } else {
        setStatus({
          isGenerating: false,
          error: 'Génération temporairement indisponible. Réessayez dans un instant.',
          audioUrl: null,
        });
        addToast('error', 'Génération interrompue', err?.message || 'Erreur lors de la communication avec le moteur audio.');
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
    if (currentPlan.id === plan.id) {
      if (usedSeconds >= quota.maxSeconds) {
        setSelectedPlanForPayment(plan);
        setIsPaymentModalOpen(true);
      } else {
        addToast('info', isEn ? 'Already Active' : 'Déjà Actif', isEn ? 'You are already subscribed to this plan.' : 'Vous êtes déjà abonné à ce forfait.');
      }
      return;
    }
    setSelectedPlanForPayment(plan);
    setIsPaymentModalOpen(true);
  };

  if (loadingAuth) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#09090B]' : 'bg-zinc-50'}`}>
        <div className="w-12 h-12 border-4 border-[#D4FF00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage onAuthSuccess={() => {}} addToast={addToast} isDark={isDark} language={language} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans flex flex-col lg:flex-row ${isDark ? 'bg-[#09090B] text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      <audio ref={previewAudioRef} preload="auto" hidden />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} isDark={isDark} />
      <AuditModal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} isDark={isDark} />
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isDark={isDark}
        language={language}
        onInstallPWA={deferredInstallPrompt ? handleTriggerPWAInstall : undefined}
      />

      {/* Recharge Modal with 3 Quota Categories */}
      <RechargeModal
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        isDark={isDark}
        language={language}
        onSelectPack={handleSelectQuotaPack}
      />

      {selectedPlanForPayment && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => { setIsPaymentModalOpen(false); setSelectedPlanForPayment(null); }}
          isDark={isDark}
          language={language}
          plan={selectedPlanForPayment}
          userEmail={session?.user?.email || ''}
          userCountryId={selectedCountry?.id || 'CI'}
          onPaymentSuccess={(planId, licenseKey) => {
            const newPlan = PRICING_PLANS.find(p => p.id === planId) || PRICING_PLANS[0];
            setCurrentPlan(newPlan);
            setUsedSeconds(0);
            setIsPaymentModalOpen(false);
            setSelectedPlanForPayment(null);
            addToast('success', isEn ? 'Payment Successful!' : 'Paiement Réussi !', isEn ? `Your ${newPlan.name} plan is now active.` : `Votre forfait ${newPlan.name} est maintenant actif.`);
          }}
        />
      )}

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
        onOpenInstallModal={handleTriggerPWAInstall}
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
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-[#D4FF00]/10' : 'bg-[#D4FF00] shadow-sm'}`}>
                          <svg className={`h-5 w-5 ${isDark ? 'text-[#D4FF00]' : 'text-zinc-900'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Cadence de génération élevée</h3>
                    <p className="text-xs sm:text-sm font-medium opacity-80 mt-0.5">
                      Vous générez des voix à un rythme très rapide. Pour garantir une qualité audio optimale, veuillez patienter quelques secondes avant votre prochaine création.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('pricing');
                    setShowQuotaError(false);
                  }}
                  className="w-full md:w-auto px-8 py-4 bg-[#D4FF00] text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shrink-0"
                >
                  ⚡ Changer de Forfait
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: STUDIO DE SYNTHESE (MVP 3 ÉTAPES SIMPLIFIÉ) */}
          {activeTab === 'studio' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              
              {/* ÉTAPE 1: TYPE DE CONTENU (QUE VEUX-TU CRÉER ?) */}
              <section
                className={`rounded-[36px] p-6 sm:p-8 border transition-all duration-300 ${
                  isDark
                    ? 'bg-[#14151C] border-white/10 shadow-2xl'
                    : 'bg-white border-[#E4E4E7] shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-[#D4FF00] text-black font-black text-xs flex items-center justify-center shadow-md">
                      1
                    </span>
                    <div>
                      <h2 className="text-lg font-black tracking-tight">
                        {isEn ? 'What are you creating?' : 'Que veux-tu créer ?'}
                      </h2>
                      <p className="text-xs text-zinc-500 font-medium">
                        {isEn
                          ? 'Select your project format — AI auto-tunes tone, pacing, and expressiveness'
                          : 'Choisis ton format — L\'IA règle automatiquement le ton, le débit et l\'expressivité'}
                      </p>
                    </div>
                  </div>
                  {settings.contentStyle && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/20 hidden sm:inline-block">
                      ✨ Auto-Tuned
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { id: 'tiktok', icon: '📱', label: 'TikTok & Reels', desc: isEn ? 'Dynamic & Fast' : 'Dynamique & Rapide', speed: 1.2, emotion: 'energetic' },
                    { id: 'advertisement', icon: '📢', label: isEn ? 'Ad & Commercial' : 'Publicité & Spot', desc: isEn ? 'Punchy & Selling' : 'Punchy & Vendeur', speed: 1.1, emotion: 'energetic' },
                    { id: 'podcast', icon: '🎙️', label: 'Podcast & Radio', desc: isEn ? 'Natural & Clear' : 'Naturel & Posé', speed: 1.0, emotion: 'neutral' },
                    { id: 'storytelling', icon: '📖', label: 'Storytelling', desc: isEn ? 'Warm & Soft' : 'Immersif & Doux', speed: 0.9, emotion: 'soft' },
                    { id: 'commercial', icon: '💼', label: 'Corporate', desc: isEn ? 'Serious & Pro' : 'Sérieux & Crédible', speed: 1.0, emotion: 'serious' },
                    { id: 'training', icon: '🎓', label: 'E-learning', desc: isEn ? 'Clear & Measured' : 'Pédagogique', speed: 0.9, emotion: 'neutral' },
                  ].map((item) => {
                    const isSelected = settings.contentStyle === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            contentStyle: item.id as ContentStyle,
                            speed: item.speed,
                            emotion: item.emotion as any,
                            personality: (item.id === 'tiktok' ? 'tiktok_creator' : item.id === 'advertisement' ? 'salesperson' : item.id === 'podcast' ? 'radio_host' : item.id === 'storytelling' ? 'narrator' : item.id === 'commercial' ? 'ceo' : 'professor') as VocalPersonality,
                            vocalObjective: (item.id === 'tiktok' ? 'entertain' : item.id === 'advertisement' ? 'sell' : item.id === 'podcast' ? 'inform' : item.id === 'storytelling' ? 'tell_story' : item.id === 'commercial' ? 'convince' : 'educate') as VocalObjective,
                          }));
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                          isSelected
                            ? 'bg-[#D4FF00] border-transparent text-black shadow-lg shadow-[#D4FF00]/20 scale-[1.02]'
                            : isDark
                            ? 'bg-[#09090B] border-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/5'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-100'
                        }`}
                      >
                        <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{item.icon}</div>
                        <p className={`text-xs font-black tracking-tight ${isSelected ? 'text-black' : isDark ? 'text-white' : 'text-zinc-900'}`}>
                          {item.label}
                        </p>
                        <p className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-black/70' : 'text-zinc-500'}`}>
                          {item.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ÉTAPE 2: CHOISIR LA VOIX & PAYS */}
              <section
                className={`rounded-[36px] p-6 sm:p-8 border transition-all duration-300 ${
                  isDark
                    ? 'bg-[#14151C] border-white/10 shadow-2xl'
                    : 'bg-white border-[#E4E4E7] shadow-lg'
                }`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-8 h-8 rounded-xl bg-[#D4FF00] text-black font-black text-xs flex items-center justify-center shadow-md">
                    2
                  </span>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">
                      {isEn ? 'Choose Voice & African Accent' : 'Choisis la Voix & l\'Accent Africain'}
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium">
                      {isEn ? 'Select gender, country, and accent intensity' : 'Sélectionne le genre, le pays et l\'intensité de l\'accent'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Genre */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">
                      {isEn ? 'Voice Gender' : 'Genre de la Voix'}
                    </label>
                    <div className="flex gap-2">
                      {['female', 'male'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setSettings({ ...settings, gender: g as any })}
                          className={`flex-1 py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                            settings.gender === g
                              ? 'bg-[#D4FF00] text-black shadow-md'
                              : isDark
                              ? 'bg-[#09090B] text-zinc-400 border border-white/5 hover:border-white/20'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'
                          }`}
                        >
                          {g === 'female' ? (isEn ? '👩 Female' : '👩 Femme') : (isEn ? '👨 Male' : '👨 Homme')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pays & Accent (Dropdown élégant) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">
                        {isEn ? 'African Country / Accent' : 'Pays / Accent Africain'}
                      </label>
                      <span className="text-[10px] font-mono text-zinc-400 font-bold">
                        {currentPlan.id === 'free' ? '5/20 🔒' : '20/20'}
                      </span>
                    </div>
                    <select
                      value={selectedCountry.id}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        const idx = COUNTRIES.findIndex((c) => c.id === targetId);
                        if (currentPlan.id === 'free' && idx >= 5) {
                          addToast(
                            'warning',
                            isEn ? '🔒 Plan Upgrade Required' : '🔒 Forfait CREATOR Requis',
                            isEn ? 'Upgrade to CREATOR to unlock all 20 countries.' : 'Passez au forfait CREATOR pour débloquer les 20 pays.'
                          );
                          setActiveTab('pricing');
                          return;
                        }
                        const country = COUNTRIES.find((c) => c.id === targetId);
                        if (country) setSelectedCountry(country);
                      }}
                      className={`w-full border rounded-2xl px-4 py-3.5 text-sm font-bold outline-none transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-[#09090B] text-white border-white/10 hover:border-white/20'
                          : 'bg-zinc-50 text-zinc-900 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {COUNTRIES.map((c, idx) => {
                        const isLocked = currentPlan.id === 'free' && idx >= 5;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.flag} {c.name} ({c.primaryLanguage}) {isLocked ? '🔒' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Intensité d'accent */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">
                      {isEn ? 'Accent Intensity' : 'Intensité de l\'Accent'}
                    </label>
                    <div className="flex gap-2">
                      {(['light', 'medium', 'strong'] as AccentLevel[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => setSettings({ ...settings, accentLevel: level })}
                          className={`flex-1 py-3.5 px-2 rounded-2xl text-xs font-black uppercase transition-all truncate border ${
                            settings.accentLevel === level
                              ? 'bg-[#D4FF00] text-black border-transparent shadow-md'
                              : isDark
                              ? 'bg-[#09090B] text-zinc-400 border-white/5 hover:border-white/20'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                          }`}
                        >
                          {level === 'light' ? (isEn ? 'Light' : 'Léger') : level === 'medium' ? (isEn ? 'Medium' : 'Moyen') : (isEn ? 'Strong' : 'Fort')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Accent description badge */}
                <div className={`mt-4 p-3.5 rounded-2xl border flex items-center gap-3 text-xs font-medium ${
                  isDark ? 'bg-[#09090B] border-white/5 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                }`}>
                  <span className="text-lg">{selectedCountry.flag}</span>
                  <span className="italic">{selectedCountry.accentDescription}</span>
                </div>

                {/* Options Avancées Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-200 dark:border-white/5">
                  {/* Expressions Locales */}
                  <div
                    onClick={() => {
                      if (currentPlan.id === 'free') {
                        addToast('warning', isEn ? 'Creator Plan Feature 🔒' : 'Forfait Creator Requis 🔒', isEn ? 'Please upgrade to Creator or Pro plan.' : 'Veuillez passer au forfait Creator ou Pro.');
                        return;
                      }
                      setSettings({ ...settings, useLocalExpressions: !settings.useLocalExpressions });
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                      currentPlan.id === 'free'
                        ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-white/5'
                        : settings.useLocalExpressions
                        ? isDark ? 'bg-[#D4FF00]/10 border-[#D4FF00]/30' : 'bg-[#D4FF00]/10 border-[#D4FF00]/40'
                        : isDark ? 'bg-[#09090B] border-white/5' : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-black uppercase tracking-widest ${settings.useLocalExpressions ? (isDark ? 'text-[#D4FF00]' : 'text-zinc-900') : 'text-zinc-500'}`}>
                        🌍 {isEn ? 'Local Expressions' : 'Expressions Locales'}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                        {isEn ? 'Injects authentic local idioms' : 'Injecte des expressions locales authentiques'}
                      </p>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${
                      settings.useLocalExpressions ? 'bg-[#D4FF00]' : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                    }`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all ${
                        settings.useLocalExpressions ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>

                  {/* Humanisation Phonétique */}
                  <div
                    onClick={() => {
                      if (currentPlan.id === 'free') {
                        addToast('warning', isEn ? 'Creator Plan Feature 🔒' : 'Forfait Creator Requis 🔒', isEn ? 'Please upgrade to Creator or Pro plan.' : 'Veuillez passer au forfait Creator ou Pro.');
                        return;
                      }
                      setSettings({ ...settings, phoneticHumanizer: !settings.phoneticHumanizer });
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                      currentPlan.id === 'free'
                        ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-white/5'
                        : settings.phoneticHumanizer
                        ? isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-500/10 border-amber-500/40'
                        : isDark ? 'bg-[#09090B] border-white/5' : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-black uppercase tracking-widest ${settings.phoneticHumanizer ? 'text-amber-500' : 'text-zinc-500'}`}>
                        ✨ {isEn ? 'AI Humanization' : 'Humanisation IA'}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                        {isEn ? 'Adds natural breaks & vocal cadence' : 'Ajoute intonations et cadences naturelles'}
                      </p>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${
                      settings.phoneticHumanizer ? 'bg-amber-500' : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                    }`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all ${
                        settings.phoneticHumanizer ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                </div>
              </section>

              {/* ÉTAPE 3: ÉCRIRE LE SCRIPT & GÉNÉRER */}
              <section
                className={`rounded-[36px] p-6 sm:p-8 border transition-all duration-300 ${
                  isDark
                    ? 'bg-[#14151C] border-white/10 shadow-2xl'
                    : 'bg-white border-[#E4E4E7] shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-[#D4FF00] text-black font-black text-xs flex items-center justify-center shadow-md">
                      3
                    </span>
                    <div>
                      <h2 className="text-lg font-black tracking-tight">
                        {isEn ? 'Enter Script & Generate' : 'Écris ton Script & Génère'}
                      </h2>
                      <p className="text-xs text-zinc-500 font-medium">
                        {isEn ? 'Type or paste your text to produce the final voiceover' : 'Tape ou colle ton texte pour produire la voix off'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold ${
                      script.length > quota.maxCharsPerScript ? 'text-red-500 font-black' :
                      script.length > quota.maxCharsPerScript * 0.8 ? 'text-amber-400 font-black' :
                      'text-zinc-400'
                    }`}>
                      {script.length} / {quota.maxCharsPerScript} {isEn ? 'char.' : 'car.'} • ~{Math.ceil(script.length / 14)} sec
                    </span>
                    {script.trim() && (
                      <button
                        onClick={() => setScript('')}
                        title={isEn ? 'Clear script' : 'Effacer le script'}
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ${
                          isDark ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : 'text-zinc-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                      >
                        ✕ {isEn ? 'Clear' : 'Effacer'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative mb-6">
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        if (script.trim() && !status.isGenerating && script.length <= quota.maxCharsPerScript && usedSeconds < quota.maxSeconds) {
                          handleGenerate();
                        }
                      }
                    }}
                    placeholder={isEn ? `Type or paste your script... (Max ${quota.maxCharsPerScript} characters for ${currentPlan.name} plan)` : `Écris ou colle ton script... (Max ${quota.maxCharsPerScript} caractères pour le forfait ${currentPlan.name})`}
                    className={`w-full min-h-[200px] p-6 sm:p-7 rounded-[28px] border outline-none resize-none text-base sm:text-lg font-medium transition-all custom-scrollbar ${
                      (status.error && !script.trim()) || script.length > quota.maxCharsPerScript
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : isDark
                        ? 'bg-[#09090B] border-white/10 text-white placeholder-zinc-600 focus:border-[#D4FF00] focus:ring-4 focus:ring-[#D4FF00]/10'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-[#D4FF00] focus:ring-4 focus:ring-[#D4FF00]/10'
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

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleGenerate}
                    disabled={status.isGenerating || !script.trim() || script.length > quota.maxCharsPerScript || usedSeconds >= quota.maxSeconds}
                    className={`flex-1 py-5 rounded-[24px] font-black text-base sm:text-lg uppercase tracking-wider transition-all active:scale-98 shadow-xl ${
                      status.isGenerating || !script.trim() || script.length > quota.maxCharsPerScript || usedSeconds >= quota.maxSeconds
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border-none shadow-none'
                        : isDark
                        ? 'bg-[#D4FF00] text-black hover:bg-[#E2FF3B] shadow-[#D4FF00]/20 hover:scale-[1.01]'
                        : 'bg-[#D4FF00] text-black hover:bg-[#E2FF3B] shadow-[#D4FF00]/25 hover:scale-[1.01]'
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
                      isEn ? '⚡ GENERATE AFRICAN VOICE' : '⚡ GÉNÉRER LA VOIX AFRICAINE'
                    )}
                  </button>

                  <button
                    onClick={handleGenerateVariants}
                    disabled={isGeneratingVariants || status.isGenerating || !script.trim() || script.length > quota.maxCharsPerScript || usedSeconds >= quota.maxSeconds}
                    className={`py-5 px-6 rounded-[24px] font-black text-xs uppercase tracking-wider transition-all border shrink-0 ${
                      isGeneratingVariants || status.isGenerating || !script.trim()
                        ? 'bg-transparent text-zinc-400 dark:text-zinc-600 cursor-not-allowed border-zinc-200 dark:border-zinc-800'
                        : isDark
                        ? 'bg-transparent text-[#D4FF00] border-[#D4FF00]/30 hover:bg-[#D4FF00]/10 hover:border-[#D4FF00]/50'
                        : 'bg-transparent text-zinc-900 border-zinc-300 hover:bg-zinc-100 hover:border-zinc-400'
                    }`}
                  >
                    {isGeneratingVariants ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>{isEn ? '3 VARIANTS...' : '3 VARIANTES...'}</span>
                      </div>
                    ) : (
                      isEn ? '🔀 3 VARIANTS (A · B · C)' : '🔀 3 VARIANTES (A · B · C)'
                    )}
                  </button>
                </div>

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
                          className="flex-1 bg-[#D4FF00]/30 dark:bg-[#D4FF00]/30 rounded-full animate-bounce"
                          style={{ height: `${h}%`, animationDelay: `${idx * 60}ms` }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-center font-mono text-zinc-500 uppercase tracking-widest">
                      {isEn ? 'Voice generation in progress...' : 'Génération de la voix en cours...'}
                    </p>
                  </div>
                )}

                {/* Waveform Player and Quality Score when ready */}
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

                    {/* Quality Score Gauge */}
                    {status.qualityScore && (
                      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#09090B] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {isEn ? '🎯 Voice Quality Score' : '🎯 Score de Qualité Vocale'}
                          </span>
                          <span className={`text-lg font-black font-mono ${
                            status.qualityScore.overall >= 80 ? 'text-emerald-500' :
                            status.qualityScore.overall >= 60 ? 'text-[#D4FF00]' : 'text-orange-400'
                          }`}>
                            {status.qualityScore.overall}/100
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: isEn ? 'Authenticity' : 'Authenticité', value: status.qualityScore.authenticity, color: '#D4FF00' },
                            { label: isEn ? 'Naturalness' : 'Naturel', value: status.qualityScore.naturalness, color: '#22D3EE' },
                            { label: isEn ? 'Expression' : 'Expressivité', value: status.qualityScore.expressiveness, color: '#F472B6' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase">{label}</span>
                                <span className="text-[9px] font-mono font-black" style={{ color }}>{value}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3 Variants Player Cards */}
                    {variants.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          {isEn ? '🔀 Variant Comparison' : '🔀 Comparaison des Variantes'}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {variants.map((v, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-2xl border transition-all ${
                                isDark ? 'bg-[#09090B] border-white/5 hover:border-[#D4FF00]/30' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400'
                              }`}
                            >
                              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: i === 0 ? '#D4FF00' : i === 1 ? '#22D3EE' : '#F472B6' }}>
                                {v.label}
                              </p>
                              {v.audioUrl ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => playVariant(v.audioUrl, i)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                      playingVariant === i
                                        ? 'bg-[#D4FF00] text-black border-transparent'
                                        : isDark ? 'border-white/10 text-zinc-300 hover:border-white/20' : 'border-zinc-300 text-zinc-700 hover:border-zinc-400'
                                    }`}
                                  >
                                    {playingVariant === i ? (
                                      <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>{isEn ? 'Pause' : 'Pause'}</>
                                    ) : (
                                      <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>{isEn ? 'Play' : 'Écouter'}</>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => { const a = document.createElement('a'); a.href = v.audioUrl; a.download = `afrivoice_variant_${String.fromCharCode(65 + i)}_${Date.now()}.wav`; a.click(); }}
                                    title={isEn ? 'Download' : 'Télécharger'}
                                    className={`p-2 rounded-xl border transition-all ${
                                      isDark ? 'border-white/10 text-zinc-400 hover:text-[#D4FF00] hover:border-[#D4FF00]/30' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400'
                                    }`}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                  </button>
                                </div>
                              ) : (
                                <p className="text-[10px] text-red-400 font-bold">{isEn ? 'Generation failed' : 'Échec de la génération'}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 3: BIBLIOTHEQUE & HISTORIQUE (History Table + Cards) */}
          {activeTab === 'history' && (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-300 space-y-8">
              <div
                className={`p-8 sm:p-10 rounded-[40px] border ${
                  isDark
                    ? 'bg-[#14151C] border-white/10 shadow-2xl'
                    : 'bg-white border-[#E4E4E7] shadow-xl shadow-[#D4FF00]/5'
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
                      className="mt-4 px-6 py-3 rounded-2xl bg-[#D4FF00] text-black font-black text-xs uppercase tracking-wider"
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
                            : 'bg-zinc-50 border-zinc-200 hover:border-[#D4FF00]/40 hover:shadow-lg'
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
                              <span className="text-[10px] font-bold uppercase text-zinc-900 dark:text-[#D4FF00]">
                                {item.settings.gender === 'female' ? 'Aoede' : 'Puck'} ({item.settings.age}a)
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
                                : 'bg-white text-zinc-800 hover:bg-[#D4FF00] hover:text-white shadow-sm'
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
                <span className={`text-xs font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full ${isDark ? 'text-[#D4FF00] bg-[#D4FF00]/10' : 'text-zinc-900 bg-[#D4FF00] shadow-sm'}`}>
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
                            : 'border-[#D4FF00] scale-[1.04] bg-white shadow-2xl shadow-[#D4FF00]/15'
                          : isDark
                          ? 'border-white/10 bg-[#14151C] hover:border-white/20 hover:-translate-y-1.5'
                          : 'border-zinc-200 bg-white hover:border-[#D4FF00]/40 hover:-translate-y-1.5 shadow-md'
                      }`}
                    >
                      {/* Popular / Active badges */}
                      {plan.isPopular && !isActivePlan && (
                        <div className="absolute top-6 right-6 bg-gradient-to-r from-[#D4FF00] to-[#E2FF3B] text-black text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-md">
                          {isEn ? 'POPULAR' : 'POPULAIRE'}
                        </div>
                      )}
                      {isActivePlan && (
                        <div
                          className={`absolute top-6 right-6 text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-md ${
                            'bg-[#D4FF00] text-black'
                          }`}
                        >
                          {isEn ? 'ACTIVE PLAN' : 'PLAN ACTIF'}
                        </div>
                      )}

                      <h3
                        className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${
                          isDark ? 'text-[#D4FF00]' : 'text-zinc-900'
                        }`}
                      >
                        {plan.name}
                      </h3>

                      <div className="flex flex-wrap items-baseline gap-1.5 mb-3">
                        <span className="text-2xl sm:text-3xl xl:text-4xl font-black font-mono tracking-tight whitespace-nowrap text-zinc-900 dark:text-white">
                          {plan.price.replace(' FCFA', '')}
                        </span>
                        {!isEn && (
                          <span className={`text-xs sm:text-sm font-extrabold whitespace-nowrap ${isDark ? 'text-[#D4FF00]' : 'text-zinc-900'}`}>
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
                                isDark ? 'bg-[#D4FF00]/20 text-[#D4FF00]' : 'bg-[#D4FF00] text-zinc-900 shadow-sm'
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
                            ? usedSeconds >= quota.maxSeconds
                              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 scale-105 animate-pulse'
                              : 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/20'
                            : isDark
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-white hover:text-black'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white'
                        }`}
                      >
                        {isActivePlan
                          ? usedSeconds >= quota.maxSeconds
                            ? (isEn ? 'RENEW PLAN' : 'SE RÉABONNER')
                            : (isEn ? 'ACTIVE PLAN' : 'FORFAIT ACTIF')
                          : (isEn ? 'Select This Plan' : 'Sélectionner ce Forfait')}
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
            <p className="font-mono uppercase tracking-[0.2em] text-[10px]">{isEn ? 'Made for the African Continent © 2026' : 'Créé pour le Continent Africain © 2026'}</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
