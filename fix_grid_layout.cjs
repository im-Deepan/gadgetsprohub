const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductList.tsx', 'utf-8');

// Replace the main layout grid structure
code = code.replace(/\{(\/\* MAIN LAYOUT WITH DOCKED DESKTOP SIDEBAR \*\/)[\s\S]*?(<aside className="hidden lg:block)/, `$1
      <div className="flex flex-col md:flex-row md:items-start md:gap-6 lg:gap-8 w-full md:px-4">
        
        {/* PERMANENTLY DOCKED DESKTOP LEFT SIDEBAR (>=1024px) & COLLAPSIBLE TABLET SIDEBAR (768-1023px) */}
        <AnimatePresence>
          {(isFilterOpen || window.innerWidth >= 1024) && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="hidden md:block lg:block w-64 lg:w-64 xl:w-72 shrink-0 sticky top-20 rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider dark:text-slate-100">
                  <SlidersHorizontal className="h-4 w-4 text-zinc-900 dark:text-white" />
                  <span>Filter Matrix</span>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[10px] font-bold text-zinc-900 hover:text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {renderFilterControls()}
            </motion.aside>
          )}
        </AnimatePresence>
        
        {/* We need to ensure the legacy <aside> is removed completely. Since we replaced the top of it, let's just make sure the rest is handled. */}`);

// We need a more robust replacement.
