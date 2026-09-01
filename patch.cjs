const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

// The error was on line 692, Expected ',' or ')' but found '}'.
// In the current file line 692 is `            )}` 
// Let's replace the whole nested ternary.
let startIdx = code.indexOf('{/* TAB CONTENT */}');
let endIdx = code.indexOf('{/* Tips block */}');
let oldBlock = code.substring(startIdx, endIdx);

let newBlock = `{/* TAB CONTENT */}
          <div className="space-y-4">
            {activeTab === 'orders' ? (
              loadingOrders ? (
                <div className="grid grid-cols-1 gap-4 animate-pulse">
                  {[...Array(2)].map((_, i) => (
                    <div key={'order-skeleton-' + i} className="h-32 rounded-xl bg-slate-50 dark:bg-slate-800/50"></div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">No Orders Found</p>
                  <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">You haven't placed any orders yet.</p>
                  <button onClick={() => onNavigate('products')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-500 transition-colors">Start Shopping</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map(order => (
                    <div key={order._id} className="border border-slate-200 rounded-2xl overflow-hidden dark:border-slate-700 bg-white dark:bg-black shadow-sm">
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">Order #{order._id.substring(order._id.length - 8).toUpperCase()}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                           <span className={'inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ' + (
                              order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                              order.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            )}>
                              {order.status}
                            </span>
                            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1.5">$\${order.totalAmount.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex gap-4">
                             <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden dark:bg-slate-900 dark:border-slate-800 shrink-0 flex items-center justify-center">
                                {item.product?.image ? (
                                  <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain p-2" />
                                ) : (
                                  <span className="text-slate-300 text-xs text-center p-2 break-all">{item.product?.name?.substring(0,2) || 'NA'}</span>
                                )}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-semibold text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400" onClick={() => onNavigate('product-detail', item.product?.slug)}>{item.product?.name || 'Unknown Product'}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs text-slate-500 dark:text-slate-400">Qty: {item.quantity}</span>
                                 <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                 <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">$\${item.price.toFixed(2)}</span>
                               </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={'bookmark-skeleton-' + i} className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-xs dark:border-slate-700 overflow-hidden">
                    <div className="h-32 bg-slate-50 dark:bg-slate-800/50 shrink-0"></div>
                    <div className="p-4 flex flex-col flex-grow space-y-2.5">
                      <div className="h-3 w-1/3 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                      <div className="h-5 w-full bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                      <div className="h-4 w-3/4 bg-slate-50 dark:bg-slate-800/50 rounded flex"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : wishlistProducts.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mx-auto w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
                  <Heart className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Your wishlist is empty</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">Save your favorite gadgets and compare them later. They will appear here safely.</p>
                <button
                  onClick={() => onNavigate('products')}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  Explore Gadgets
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistProducts.map((p) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={p._id}
                    className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-xs transition-all hover:shadow-md dark:border-slate-700 dark:bg-black overflow-hidden relative"
                  >
                    <button
                      onClick={() => handleRemoveBookmark(p._id)}
                      className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 shadow-sm text-rose-500 hover:bg-rose-50 hover:scale-110 transition-all dark:bg-slate-900/90"
                      aria-label="Remove from bookmarks"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                    <div className="h-40 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 cursor-pointer shrink-0" onClick={() => onNavigate('product-detail', p.slug)}>
                      <img
                        src={p.image || 'https://via.placeholder.com/300?text=No+Image'}
                        alt={p.name}
                        className="h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">{p.category}</div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-indigo-600" onClick={() => onNavigate('product-detail', p.slug)}>
                        {p.name}
                      </h3>
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <span className="text-xs font-black font-mono text-slate-950 dark:text-white">{formatProductPrice(getValidatedPricing(p).price, p)}</span>
                        <button
                          onClick={() => onNavigate('product-detail', p.slug)}
                          className="rounded bg-slate-50 hover:bg-slate-100 py-1 px-3.2 text-[10px] text-slate-600 font-bold dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 font-mono"
                        >
                          Specs Deck
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          `;

code = code.substring(0, startIdx) + newBlock + code.substring(endIdx);
fs.writeFileSync('src/pages/Profile.tsx', code);
