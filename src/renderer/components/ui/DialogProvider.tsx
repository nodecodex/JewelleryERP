import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

// --- Types ---
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type AlertType = 'success' | 'error' | 'warning' | 'info';
export type ConfirmVariant = 'default' | 'danger';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface DialogContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showAlert: (options: AlertOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

// --- Context ---
const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

// --- Icons ---
const getIcon = (type: ToastType | AlertType, className: string = 'w-5 h-5') => {
  switch (type) {
    case 'success': return <CheckCircle className={`${className} text-emerald-500`} />;
    case 'error': return <AlertCircle className={`${className} text-rose-500`} />;
    case 'warning': return <AlertTriangle className={`${className} text-amber-500`} />;
    case 'info': return <Info className={`${className} text-blue-500`} />;
    default: return <Info className={className} />;
  }
};

// --- Provider Component ---
export function DialogProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Alert state
  const [alertState, setAlertState] = useState<{ options: AlertOptions; resolve: () => void } | null>(null);
  
  // Confirm state
  const [confirmState, setConfirmState] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null);

  // Previous focus elements to restore when modals close
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      setTimeout(() => previousFocusRef.current?.focus(), 10);
    }
  };

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const showAlert = useCallback((options: AlertOptions | string) => {
    return new Promise<void>((resolve) => {
      saveFocus();
      const opts = typeof options === 'string' ? { message: options, title: 'Alert', type: 'info' as AlertType } : { type: 'info' as AlertType, ...options };
      setAlertState({ options: opts, resolve });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      saveFocus();
      const opts = typeof options === 'string' ? { title: 'Confirm', message: options } : options;
      setConfirmState({ options: opts, resolve });
    });
  }, []);

  const handleAlertClose = useCallback(() => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
      restoreFocus();
    }
  }, [alertState]);

  const handleConfirmClose = useCallback((value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
      restoreFocus();
    }
  }, [confirmState]);

  // Focus trap for modals
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (alertState) handleAlertClose();
        if (confirmState) handleConfirmClose(false);
      }
    };
    
    if (alertState || confirmState) {
      window.addEventListener('keydown', handleKeyDown);
      // Try to focus inside modal
      setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelector('button');
          if (focusable) focusable.focus();
        }
      }, 50);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alertState, confirmState, handleAlertClose, handleConfirmClose]);

  return (
    <DialogContext.Provider value={{ showToast, showAlert, showConfirm }}>
      {children}

      {/* Toasts */}
      <div className="fixed top-4 right-1/2 translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-md shadow-lg text-white text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-4
              ${toast.type === 'error' ? 'bg-rose-500' : toast.type === 'warning' ? 'bg-amber-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}
            `}
          >
            {getIcon(toast.type, 'w-4 h-4 text-white')}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Alert Modal */}
      {alertState && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div 
            ref={modalRef}
            className="bg-card border border-border shadow-xl rounded-lg w-full max-w-sm overflow-hidden animate-in zoom-in-95"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-4 flex gap-3">
              <div className="shrink-0 mt-0.5">
                {getIcon(alertState.options.type || 'info', 'w-6 h-6')}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {alertState.options.title || 'Alert'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {alertState.options.message}
                </p>
              </div>
            </div>
            <div className="p-3 bg-secondary/50 border-t border-border flex justify-end">
              <button
                onClick={handleAlertClose}
                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div 
            ref={modalRef}
            className="bg-card border border-border shadow-xl rounded-lg w-full max-w-sm overflow-hidden animate-in zoom-in-95"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-4 flex gap-3">
              <div className="shrink-0 mt-0.5">
                {confirmState.options.variant === 'danger' ? (
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {confirmState.options.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                  {confirmState.options.message}
                </p>
              </div>
            </div>
            <div className="p-3 bg-secondary/50 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-1.5 bg-secondary text-secondary-foreground border border-border text-xs font-bold rounded-md hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-border"
              >
                {confirmState.options.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  confirmState.options.variant === 'danger' 
                    ? 'bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-500' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50'
                }`}
              >
                {confirmState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
