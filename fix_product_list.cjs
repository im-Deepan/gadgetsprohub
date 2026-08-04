const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductList.tsx', 'utf-8');

// Replace the lg:hidden overlay structure with a better one
code = code.replace(/\{(\/\* Dynamic Mobile Sliding Side Drawer Overlay \*\/)[\s\S]*?(<\/AnimatePresence>)/, `$1
      <AnimatePresence>
        {isFilterOpen && (
          <div className="lg:hidden">
            {/* Backdrop opacity sheet overlay (hidden on md) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close Filters" 
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/50 md:bg-transparent backdrop-blur-xs md:backdrop-blur-none cursor-pointer"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 border-r border-slate-100 bg-white shadow-2xl flex flex-col dark:border-slate-800 dark:bg-slate-950 overflow-y-auto h-auto max-h-screen"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b p-4 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider dark:text-slate-100">
                  <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
                  <span>Filter Matrix</span>
                </div>
                <div className="flex items-center gap-3">
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-300 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Filter Forms content */}
              <div className="p-5">
                {renderFilterControls()}
              </div>
              
              {/* Footer action bar (sticky to content bottom) */}
              <div className="border-t p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 flex gap-3 mt-auto shrink-0">
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="flex-1 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs text-center dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>`);

code = code.replace(/<aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0 sticky top-20 rounded-2xl border border-slate-200\/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900\/60 space-y-5">/, `<aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0 sticky top-20 rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-5">`);

fs.writeFileSync('src/pages/ProductList.tsx', code);
console.log('Fixed ProductList drawer');
