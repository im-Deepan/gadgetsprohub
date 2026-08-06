import React from 'react';
import { useCompare } from '../context/CompareContext';
import { Scale, X, ArrowRight } from 'lucide-react';
import { getShortProductTitle } from '../utils/productUtils';

export const CompareBar: React.FC = () => {
  const { compareList, removeFromCompare, clearCompare, setIsOpen } = useCompare();

  if (compareList.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-700/60 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-700">
            <Scale className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold font-mono">Compare ({compareList.length}/4)</span>
          </div>

          <div className="flex items-center gap-2">
            {compareList.map((product) => (
              <div
                key={product._id}
                className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/80 px-2 py-1 rounded-lg shrink-0 text-xs font-medium"
              >
                <img src={product.images?.[0]} alt="" className="w-4 h-4 object-contain rounded" />
                <span className="max-w-[100px] truncate text-[11px] text-slate-200">
                  {getShortProductTitle(product.name, product.brand, 15)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFromCompare(product._id)}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Remove item"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={clearCompare}
            className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors hidden sm:block font-medium"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span>Compare Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
