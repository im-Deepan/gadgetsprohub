import React from 'react';
import { AlertTriangle } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-zinc-900 transition-all">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/30' : 'bg-amber-50 text-amber-500 dark:bg-amber-955/30'}`}>
            <AlertTriangle className="h-6 w-6 shrink-0" />
          </div>
          <div className="space-y-1 my-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-sans">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">{message}</p>
          </div>
        </div>
        
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-355 py-2 px-3.5 text-xs font-bold transition-all cursor-pointer"
          >
            {cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (onConfirm) onConfirm();
              onCancel();
            }}
            className={`rounded-lg py-2 px-3.5 text-xs font-bold text-white transition-all shadow-sm active:scale-95 cursor-pointer ${
              isDestructive 
                ? 'bg-rose-600 hover:bg-rose-700' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
