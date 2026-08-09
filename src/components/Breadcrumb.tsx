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
  if (!items || items.length === 0) return null;

  return (
    <motion.nav 
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center text-xs sm:text-sm text-slate-500 dark:text-slate-300 overflow-x-auto whitespace-nowrap scrollbar-none py-2 px-1 max-w-full ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center min-w-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrentPage;
          // Hide 'Home' on mobile if there are 4+ breadcrumb items to keep mobile UI compact
          const isHiddenOnMobile = index === 0 && items.length >= 4;

          return (
            <li 
              key={`${item.label}-${index}`} 
              className={`flex items-center min-w-0 shrink ${isHiddenOnMobile ? 'hidden sm:flex' : 'flex'}`}
            >
              <button
                type="button"
                onClick={item.onClick}
                disabled={isLast || !item.onClick}
                title={item.label}
                className={`flex items-center hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors duration-200 min-h-[44px] px-1 ${
                  isLast ? 'text-slate-800 dark:text-slate-100 font-bold cursor-default' : 'cursor-pointer text-slate-500 dark:text-slate-400'
                } ${index === 0 ? 'inline-flex items-center gap-1' : ''}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {index === 0 && <Home className="w-3.5 h-3.5 shrink-0" />}
                <span className={`truncate ${isLast ? 'max-w-[130px] sm:max-w-[300px]' : 'max-w-[90px] sm:max-w-[180px]'}`}>
                  {item.label}
                </span>
              </button>
              {!isLast && (
                <ChevronRight className="w-3.5 h-3.5 mx-1 text-slate-300 dark:text-slate-600 shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </motion.nav>
  );
};
