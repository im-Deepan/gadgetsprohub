import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TabErrorProps {
  message: string;
  title: string;
  onRetry: () => void;
}

export const TabErrorView: React.FC<TabErrorProps> = ({ message, title, onRetry }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <div className="border border-rose-50 dark:border-rose-950/60 bg-rose-50/10 dark:bg-rose-950/10 p-8 rounded-2xl text-center space-y-4 my-4 max-w-2xl mx-auto">
      <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto animate-bounce shrink-0" />
      <div className="space-y-1">
        <h4 className="text-xs font-black uppercase text-rose-500 dark:text-rose-300 tracking-wider font-sans">{title}</h4>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 leading-relaxed font-sans">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
      >
        <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
        <span>Retry Sourcing This Resource</span>
      </button>
    </div>
  );
};
