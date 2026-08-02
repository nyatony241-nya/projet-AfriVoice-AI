import React from 'react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  language?: 'fr' | 'en';
}

const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose, isDark, language = 'fr' }) => {
  if (!isOpen) return null;
  const isEn = language === 'en';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto ${
        isDark ? 'bg-[#181D29] border border-white/10 text-zinc-100' : 'bg-white border border-zinc-200 text-zinc-900'
      }`}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl overflow-hidden shadow-lg border border-[#D4FF00]/30">
            <img src="/logo192.png" alt="AfriVoice App" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2">
            {isEn ? 'Install AfriVoice App' : 'Installer l\'application AfriVoice'}
          </h2>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {isEn ? 'Add the studio to your home screen for a full-screen, native experience without needing to open your browser.' : 'Ajoutez le studio à votre écran d\'accueil pour une expérience native plein écran sans ouvrir votre navigateur.'}
          </p>
        </div>

        <div className="space-y-6">
          {/* iOS Instructions */}
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#09090B] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <h3 className="font-black text-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/></svg>
              iPhone & iPad (Safari)
            </h3>
            <ol className="space-y-3 text-sm list-decimal list-inside font-bold text-zinc-600 dark:text-zinc-400">
              <li>{isEn ? 'Tap the Share button ' : 'Appuyez sur le bouton Partager '} 
                <span className="inline-block mx-1 p-1 bg-zinc-200 dark:bg-zinc-800 rounded">
                  <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                </span>
                {isEn ? ' at the bottom.' : ' en bas de l\'écran.'}
              </li>
              <li>{isEn ? 'Scroll down and tap ' : 'Faites défiler et appuyez sur '} <span className="text-zinc-900 dark:text-white">"{isEn ? 'Add to Home Screen' : 'Sur l\'écran d\'accueil'}"</span>.</li>
              <li>{isEn ? 'Confirm by tapping ' : 'Confirmez en appuyant sur '} <span className="text-zinc-900 dark:text-white">"{isEn ? 'Add' : 'Ajouter'}"</span>.</li>
            </ol>
          </div>

          {/* Android Instructions */}
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#09090B] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <h3 className="font-black text-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#3DDC84]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993s-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993s-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0216 3.503C15.82 8.0827 14 7.6445 12 7.6445s-3.82.4382-5.1375 1.3059L4.841 5.4475a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/></svg>
              Android (Chrome)
            </h3>
            <ol className="space-y-3 text-sm list-decimal list-inside font-bold text-zinc-600 dark:text-zinc-400">
              <li>{isEn ? 'Tap the menu icon ' : 'Appuyez sur le menu '} 
                <span className="inline-block mx-1 p-1 bg-zinc-200 dark:bg-zinc-800 rounded">
                  <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </span>
                {isEn ? ' (three dots) in the top right.' : ' (trois points) en haut à droite.'}
              </li>
              <li>{isEn ? 'Select ' : 'Sélectionnez '} <span className="text-zinc-900 dark:text-white">"{isEn ? 'Install App' : 'Installer l\'application'}"</span> {isEn ? 'or' : 'ou'} <span className="text-zinc-900 dark:text-white">"{isEn ? 'Add to Home screen' : 'Ajouter à l\'écran d\'accueil'}"</span>.</li>
            </ol>
          </div>

          {/* Computer Instructions */}
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#09090B] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <h3 className="font-black text-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#D4FF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Mac / PC (Chrome, Edge, Safari)
            </h3>
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
              {isEn ? 'Look for the install icon ' : 'Cherchez l\'icône d\'installation '}
              <span className="inline-block mx-1 p-1 bg-zinc-200 dark:bg-zinc-800 rounded">
                <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              </span>
              {isEn ? ' at the far right of your address bar and click it.' : ' tout à droite de votre barre d\'adresse en haut, et cliquez dessus.'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InstallAppModal;
