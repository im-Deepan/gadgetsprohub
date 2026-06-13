import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface TabErrorProps {
  message: string;
  title: string;
  onRetry: () => void;
}

export const TabErrorView: React.FC<TabErrorProps> = ({ message, title, onRetry }) => {
  return (
    <div className="border border-rose-100 dark:border-rose-950/60 bg-rose-50/10 dark:bg-rose-950/10 p-8 rounded-2xl text-center space-y-4 my-4 max-w-2xl mx-auto">
      <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto animate-bounce shrink-0" />
      <div className="space-y-1">
        <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider font-sans">{title}</h4>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
      >
        <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
        <span>Retry Sourcing This Resource</span>
      </button>
    </div>
  );
};
