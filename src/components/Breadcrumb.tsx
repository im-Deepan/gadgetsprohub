import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <motion.nav 
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center text-xs sm:text-sm text-slate-400 dark:text-slate-300 overflow-x-auto whitespace-nowrap scrollbar-hide py-2 px-1 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrentPage;
          return (
            <li key={index} className="flex items-center">
              <button
                onClick={item.onClick}
                disabled={isLast || !item.onClick}
                className={`flex items-center hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors ${
                  isLast ? 'text-slate-700 dark:text-slate-100 font-semibold cursor-default' : 'cursor-pointer'
                } ${index === 0 ? 'inline-flex items-center gap-1.5' : ''}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {index === 0 && <Home className="w-3.5 h-3.5 mb-0.5" />}
                <span className="truncate max-w-[120px] sm:max-w-[200px]">{item.label}</span>
              </button>
              {!isLast && (
                <ChevronRight className="w-3.5 h-3.5 mx-2 text-slate-200 dark:text-slate-500 shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </motion.nav>
  );
};
