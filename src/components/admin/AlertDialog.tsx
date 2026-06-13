import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ isOpen, title, message, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-zinc-900 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30 rounded-full shrink-0">
            <ShieldCheck className="h-6 w-6 shrink-0" />
          </div>
          <div className="space-y-1 my-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-sans">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans whitespace-pre-wrap">{message}</p>
          </div>
        </div>
        
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Dismiss Info
          </button>
        </div>
      </div>
    </div>
  );
};
