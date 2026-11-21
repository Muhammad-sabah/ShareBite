import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      if (type === 'success' || type === 'warning' || type === 'info') {
        setTimeout(() => dismiss(id), 4500);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-md w-[calc(100%-2rem)] pointer-events-none"
      >
        {toasts.map((t) => {
          const styles =
            t.type === 'success'
              ? 'bg-[#DFF2F0] border-[#167C80] text-[#105B60]'
              : t.type === 'info'
              ? 'bg-[#DFF2F0] border-[#55AAA5] text-[#167C80]'
              : t.type === 'warning'
              ? 'bg-[#FFF3E0] border-[#F57C00] text-[#E65100]'
              : 'bg-rose-50 border-rose-300 text-rose-800';

          const Icon =
            t.type === 'success'
              ? CheckCircle2
              : t.type === 'info'
              ? Info
              : t.type === 'warning'
              ? AlertTriangle
              : AlertCircle;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${styles}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium flex-1 leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="opacity-70 hover:opacity-100 p-0.5 rounded transition"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
