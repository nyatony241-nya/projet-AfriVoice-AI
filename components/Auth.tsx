import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setIsVerifying(true);
        setMessage('Un code de vérification à 6 chiffres a été envoyé à votre adresse email.');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error, data } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });
      
      if (error) throw error;

      // OTP is valid. Now we must sign the user in with their password because verifyOtp for signup 
      // doesn't always establish a full session immediately depending on Supabase settings.
      // But actually verifyOtp creates a session if it succeeds! Let's check data.session.
      if (data.session) {
        onSuccess();
      } else {
        // If session is not returned, we fall back to manual login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onSuccess();
      }

    } catch (err: any) {
      setError(err.message || 'Code invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#1A1D27] rounded-3xl shadow-xl border border-zinc-200 dark:border-[#2E3341] p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#D4FF00]/10 text-[#D4FF00] mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-[#F1F3F5]">
              Vérifiez votre Email
            </h2>
            <p className="text-zinc-500 dark:text-[#8B95A5] mt-2 text-sm">
              Entrez le code à 6 chiffres envoyé à <br/><span className="font-bold text-zinc-800 dark:text-white">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 text-center">
                Code de vérification
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-4 rounded-xl border border-zinc-300 dark:border-[#3F3F46] bg-zinc-50 dark:bg-[#0F1117] text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#D4FF00] focus:border-transparent transition-all outline-none text-center text-3xl tracking-[0.5em] font-black"
                placeholder="••••••"
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 rounded-xl bg-[#D4FF00] hover:bg-[#bce600] text-black font-black uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Vérification...' : 'Valider le Compte'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsVerifying(false);
                setIsLogin(true);
                setError(null);
                setMessage(null);
              }}
              className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1D27] rounded-3xl shadow-xl border border-zinc-200 dark:border-[#2E3341] p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#D4FF00]/10 text-[#D4FF00] mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-[#F1F3F5]">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="text-zinc-500 dark:text-[#8B95A5] mt-2 text-sm">
            Accédez au Studio de Génération Vocale
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-[#3F3F46] bg-zinc-50 dark:bg-[#0F1117] text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#D4FF00] focus:border-transparent transition-all outline-none"
              placeholder="votre@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-[#3F3F46] bg-zinc-50 dark:bg-[#0F1117] text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#D4FF00] focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#D4FF00] hover:bg-[#bce600] text-black font-black uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Chargement...' : isLogin ? 'Se Connecter' : 'S\'inscrire'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="text-sm font-semibold text-zinc-500 dark:text-[#8B95A5] hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            {isLogin 
              ? "Vous n'avez pas de compte ? Créez-en un." 
              : "Vous avez déjà un compte ? Connectez-vous."}
          </button>
        </div>
      </div>
    </div>
  );
}
