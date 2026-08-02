const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const forgotUI = `
          {isForgotPassword ? (
            <div className="space-y-4">
              {!resetToken && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-300 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="hello@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-100 bg-white p-2.5 pl-9 outline-none text-slate-950 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition-colors duration-300"
                    />
                  </div>
                </div>
              )}
              {resetToken && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-300 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-100 bg-white p-2.5 pl-9 outline-none text-slate-950 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition-colors duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || forgotPasswordSuccess}
                className="w-full text-xs relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-white dark:border-slate-300 dark:border-t-slate-950" />
                    Processing...
                  </span>
                ) : (
                  <span>{resetToken ? 'Reset Password' : 'Send Reset Link'}</span>
                )}
              </button>
              
              {simulatedResetUrl && (
                <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800 break-all">
                  <strong>Simulated Link:</strong> <a href={simulatedResetUrl} className="underline" target="_blank" rel="noreferrer">{simulatedResetUrl}</a>
                </div>
              )}
              
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(false)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : (
`;

code = code.replace(/<AnimatePresence mode="popLayout" initial=\{false\}>/g, forgotUI + '<AnimatePresence mode="popLayout" initial={false}>');
code = code.replace(/<\/form>/g, ')}</form>');
fs.writeFileSync('src/pages/Login.tsx', code);
