import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Toast } from './ToastContainer';

interface AuthPageProps {
  onAuthSuccess: () => void;
  addToast: (type: Toast['type'], title: string, message?: string) => void;
  isDark: boolean;
  language: 'fr' | 'en';
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, addToast, isDark, language }) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'email' | 'token'>('email');
  const [loading, setLoading] = useState(false);
  const isEn = language === 'en';

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });
    setLoading(false);

    if (error) {
      addToast('error', isEn ? 'Authentication Error' : 'Erreur d\'authentification', error.message);
    } else {
      addToast('success', isEn ? 'Code Sent' : 'Code envoyé', isEn ? 'Check your email for the verification code.' : 'Vérifiez vos e-mails pour le code de vérification.');
      setStep('token');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    setLoading(false);

    if (error) {
      addToast('error', isEn ? 'Invalid Code' : 'Code Invalide', error.message);
    } else {
      addToast('success', isEn ? 'Connected' : 'Connecté', isEn ? 'Welcome to AfriVoice Studio.' : 'Bienvenue sur AfriVoice Studio.');
      onAuthSuccess();
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-500 ${isDark ? 'bg-[#09090B] text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      <div className={`w-full max-w-md p-8 sm:p-10 rounded-[40px] border shadow-2xl animate-in fade-in zoom-in-95 duration-500 ${isDark ? 'bg-[#14151C] border-white/10' : 'bg-white border-[#E4E4E7]'}`}>
        
        {/* Branding */}
        <div className="flex flex-col items-center justify-center mb-10 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl ${isDark ? 'bg-[#D4FF00] shadow-[#D4FF00]/20' : 'bg-[#D4FF00] shadow-[#D4FF00]/30'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tighter">AfriVoice<span className="text-[#D4FF00]">.ai</span></h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
            {isEn ? 'Authentication Required' : 'Authentification Requise'}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                {isEn ? 'Email Address' : 'Adresse E-mail'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="studio@exemple.com"
                className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border transition-all outline-none ${
                  isDark
                    ? 'bg-[#09090B] border-white/10 focus:border-[#D4FF00] text-white'
                    : 'bg-zinc-50 border-zinc-200 focus:border-[#D4FF00] text-zinc-900'
                }`}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 shadow-none'
                  : 'bg-[#D4FF00] text-black hover:bg-[#E2FF3B] shadow-[#D4FF00]/25'
              }`}
            >
              {loading ? (
                <span className="animate-pulse">{isEn ? 'SENDING...' : 'ENVOI EN COURS...'}</span>
              ) : (
                <span>{isEn ? 'RECEIVE VERIFICATION CODE' : 'RECEVOIR LE CODE DE VÉRIFICATION'}</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  {isEn ? 'Verification Code' : 'Code de vérification'}
                </label>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-300 underline"
                >
                  {isEn ? 'Change email' : 'Modifier l\'e-mail'}
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={8}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="00000000"
                className={`w-full px-5 py-4 rounded-2xl text-2xl tracking-[0.4em] text-center font-black border transition-all outline-none ${
                  isDark
                    ? 'bg-[#09090B] border-white/10 focus:border-[#D4FF00] text-[#D4FF00]'
                    : 'bg-zinc-50 border-zinc-200 focus:border-[#D4FF00] text-zinc-900'
                }`}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 shadow-none'
                  : 'bg-[#D4FF00] text-black hover:bg-[#E2FF3B] shadow-[#D4FF00]/25'
              }`}
            >
              {loading ? (
                <span className="animate-pulse">{isEn ? 'VERIFYING...' : 'VÉRIFICATION...'}</span>
              ) : (
                <span>{isEn ? 'VERIFY & CONNECT' : 'VÉRIFIER ET SE CONNECTER'}</span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default AuthPage;
