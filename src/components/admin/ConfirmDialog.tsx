import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  isDestructive: boolean;
  cancelText: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  title, 
  message, 
  isDestructive, 
  cancelText, 
  confirmText, 
  onConfirm, 
  onCancel 
}) => {
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-50 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-zinc-800 transition-all">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-rose-50 text-rose-400 dark:bg-rose-950/30' : 'bg-amber-50 text-amber-400 dark:bg-amber-950/30'}`}>
            <AlertTriangle className="h-6 w-6 shrink-0" />
          </div>
          <div className="space-y-1 my-1">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-sans">{title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-300 font-medium leading-relaxed font-sans">{message}</p>
          </div>
        </div>
        
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 py-2 px-3.5 text-xs font-bold transition-all cursor-pointer"
          >
            {cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (onConfirm) {
                try {
                  await Promise.resolve(onConfirm());
                } catch (e) {
                  console.error('[ConfirmDialog Error]', e);
                }
              }
              onCancel();
            }}
            className={`rounded-lg py-2 px-3.5 text-xs font-bold text-white transition-all shadow-sm active:scale-95 cursor-pointer ${
              isDestructive 
                ? 'bg-rose-500 hover:bg-rose-600' 
                : 'bg-indigo-500 hover:bg-indigo-600'
            }`}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
