import React, { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ isOpen, title, message, onDismiss }) => {
  const { isAdmin } = useAuth();
  
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onDismiss]);

  if (!isOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-50 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-zinc-800 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-400 dark:bg-indigo-950/30 rounded-full shrink-0">
            <ShieldCheck className="h-6 w-6 shrink-0" />
          </div>
          <div className="space-y-1 my-1">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-sans">{title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-300 font-medium leading-relaxed font-sans whitespace-pre-wrap">{message}</p>
          </div>
        </div>
        
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Dismiss Info
          </button>
        </div>
      </div>
    </div>
  );
};
