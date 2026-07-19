import React, { useEffect } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  isDark: boolean;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss, isDark }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} isDark={isDark} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void; isDark: boolean }> = ({
  toast,
  onDismiss,
  isDark,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const typeConfig = {
    success: {
      bg: isDark ? 'bg-[#18181B] border-[#16A34A]/40 text-white' : 'bg-white border-[#16A34A]/40 text-zinc-900',
      iconBg: 'bg-[#16A34A]/10 text-[#16A34A]',
      accent: '#16A34A',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: isDark ? 'bg-[#18181B] border-[#DC2626]/40 text-white' : 'bg-white border-[#DC2626]/40 text-zinc-900',
      iconBg: 'bg-[#DC2626]/10 text-[#DC2626]',
      accent: '#DC2626',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      bg: isDark ? 'bg-[#18181B] border-[#CA8A04]/40 text-white' : 'bg-white border-[#CA8A04]/40 text-zinc-900',
      iconBg: 'bg-[#CA8A04]/10 text-[#CA8A04]',
      accent: '#CA8A04',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      bg: isDark ? 'bg-[#18181B] border-[#D4FF00]/40 text-white' : 'bg-white border-[#D4FF00]/40 text-zinc-900',
      iconBg: 'bg-[#D4FF00]/10 text-[#D4FF00]',
      accent: '#D4FF00',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3.5 transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${typeConfig.bg}`}
      style={{ boxShadow: `0 10px 30px -10px ${typeConfig.accent}25` }}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeConfig.iconBg}`}>
        {typeConfig.icon}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-sm font-black tracking-tight leading-snug">{toast.title}</h4>
        {toast.message && <p className="text-xs opacity-75 mt-0.5 leading-relaxed font-medium">{toast.message}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg transition-colors shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default ToastContainer;
