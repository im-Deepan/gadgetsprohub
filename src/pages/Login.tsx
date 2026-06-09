import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, User, ShieldCheck, Heading, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onNavigate: (view: string, slug?: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login, register, loginWithGoogle, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Fields state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto direct if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const isAdminUser = user.role === 'admin';
      if (isAdminUser) {
        try {
          window.open('/?view=admin', '_blank');
        } catch (e) {
          console.warn("Popup block prevented opening tab:", e);
        }
        onNavigate('admin');
      } else {
        onNavigate('home');
      }
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError('');

    if (activeTab === 'login') {
      const res = await login(email, password);
      if (!res.success) {
        const errorMsg = res.error || 'Check login inputs.';
        setAuthError(errorMsg);
        showToast(errorMsg, 'error');
      } else {
        showToast('Successfully signed in. Welcome back!', 'success');
      }
    } else {
      if (!name) {
        setAuthError('Name is required.');
        showToast('Name is required.', 'warning');
        setSubmitting(false);
        return;
      }
      const res = await register(email, password, name);
      if (!res.success) {
        const errorMsg = res.error || 'Server error creating registration.';
        setAuthError(errorMsg);
        showToast(errorMsg, 'error');
      } else {
        showToast('Account registered successfully! Welcome aboard!', 'success');
      }
    }
    setSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setAuthError('');
    const res = await loginWithGoogle();
    if (!res.success) {
      const errorMsg = res.error || 'Google Login aborted.';
      setAuthError(errorMsg);
      showToast(errorMsg, 'error');
    } else {
      showToast('Successfully authenticated via Google!', 'success');
    }
    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 flex flex-col justify-center items-center gap-4">
      
      {/* High Visibility Floating Back Button */}
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 shadow-sm transition-all hover:bg-slate-50 cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Store Home</span>
      </button>

      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-md dark:bg-slate-900 dark:border-slate-800 space-y-6">
        
        {/* Visual Brand Greeting */}
        <div className="text-center space-y-1.5 flex flex-col items-center">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 bg-clip-text text-transparent font-black">GADGETSPROHUB</span>
            <span className="text-slate-400 dark:text-slate-500 font-bold">MEMBER PORTAL</span>
          </h2>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">
            {activeTab === 'login' ? 'Welcome Back, Explorer' : 'Create New Account'}
          </h1>
        </div>

        {/* Custom Toggle tabs */}
        <div className="flex border-b border-slate-100 p-0.5 bg-slate-50 rounded-xl dark:border-slate-800 dark:bg-slate-950 shrink-0">
          <button
            onClick={() => { setActiveTab('login'); setAuthError(''); }}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'login' ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800' : 'text-slate-500'}`}
          >
            Access Sign In
          </button>
          <button
            onClick={() => { setActiveTab('register'); setAuthError(''); }}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'register' ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800' : 'text-slate-500'}`}
          >
            Register Account
          </button>
        </div>

        {/* Input Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {authError && (
            <div className="rounded-xl bg-rose-50 p-3.5 text-xs font-medium text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
              {authError}
            </div>
          )}

          {activeTab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 pl-9 outline-none text-slate-950 focus:border-indigo-505 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="buyer@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 pl-9 outline-none text-slate-950 focus:border-indigo-505 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 pl-9 outline-none text-slate-950 focus:border-indigo-505 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl text-white font-bold py-3 text-xs tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>{submitting ? 'Verifying account...' : activeTab === 'login' ? 'Sign In Now' : 'Create Member Account'}</span>
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Or continue with</span>
          <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer active:scale-95"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.177-2.767-6.177-6.177 0-3.41 2.767-6.177 6.177-6.177 1.483 0 2.834.524 3.9 1.4l3.07-3.07C18.847 1.94 15.727 1 12.24 1 6.143 1 1.2 5.943 1.2 12s4.943 11 11.04 11c6.343 0 10.556-4.453 10.556-10.743 0-.616-.055-1.22-.163-1.815V10.285H12.24z"
            />
          </svg>
          <span>Sign In with Google Account</span>
        </button>

        {/* Registration Note */}
        <div className="text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
            Secure Member Authentication
          </p>
        </div>

      </div>
    </div>
  );
};
