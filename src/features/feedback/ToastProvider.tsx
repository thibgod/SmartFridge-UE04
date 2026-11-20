import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { Toast } from '@/components/ui/Toast';

export interface ToastOptions {
  message: string;
  tone?: 'success' | 'neutral' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
// Contexte séparé : seuls les éléments flottants (bouton « + ») se redessinent quand un toast passe.
const ToastVisibleContext = createContext(false);

const DEFAULT_DURATION = 4000;
/** Avec « Annuler », on laisse le temps de lire puis d’atteindre le bouton. */
const ACTION_DURATION = 6000;

/** Retour visuel non bloquant pour les actions importantes (avec « Annuler » éventuel). */
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...options, key: Date.now() });
      timer.current = setTimeout(hide, options.durationMs ?? (options.actionLabel ? ACTION_DURATION : DEFAULT_DURATION));
    },
    [hide],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastVisibleContext.Provider value={toast !== null}>{children}</ToastVisibleContext.Provider>
      {toast ? (
        <Toast
          key={toast.key}
          message={toast.message}
          tone={toast.tone ?? 'neutral'}
          actionLabel={toast.actionLabel}
          onAction={
            toast.onAction
              ? () => {
                  hide();
                  toast.onAction?.();
                }
              : undefined
          }
          onDismiss={hide}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

/** Vrai pendant qu’un toast est affiché : un bouton flottant peut se décaler pour rester visible. */
export function useToastVisible(): boolean {
  return useContext(ToastVisibleContext);
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast doit être utilisé dans <ToastProvider>.');
  return context;
}
