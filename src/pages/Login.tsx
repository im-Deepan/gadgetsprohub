import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, User, ShieldCheck, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { loginSchema, registerSchema } from '../utils/schemas';
import { apiFetch } from '../utils/apiClient';

interface LoginProps {
  onNavigate: (view: string, slug?: string) => void;
}

const translateAuthError = (errorStr: string): { title: string; description: string; suggestion?: string } => {
  const err = errorStr.toLowerCase();
  
  if (err.includes('incorrect') || err.includes('invalid-credential') || err.includes('wrong-password') || err.includes('invalid credentials') || err.includes('user-not-found') || err.includes('no user record')) {
    return {
      title: "Authentication Failed",
      description: "The email address or password you entered doesn't match our records.",
      suggestion: "Please check your spelling or verify you're on the right tab if you already have an account."
    };
  }
  
  if (err.includes('already in use') || err.includes('email-already-in-use') || err.includes('already exists')) {
    return {
      title: "Account Already Exists",
      description: "This email address is already registered under an existing account.",
      suggestion: "Try switching to the 'Access Sign In' tab to log in, or use a different email address to register."
    };
  }
  
  if (err.includes('weak-password') || err.includes('password is too short') || err.includes('at least 6 characters')) {
    return {
      title: "Password is Too Weak",
      description: "The password provided does not meet our security requirements.",
      suggestion: "Ensure your password is at least 6 characters long for complete safety."
    };
  }
  
  if (err.includes('network-request-failed') || err.includes('failed to fetch')) {
    return {
      title: "Connection Lost",
      description: "A network error occurred while contacting our secure authentication servers.",
      suggestion: "Please check your internet connection and try again."
    };
  }
  

  if (err.includes('profile name') || err.includes('name is required')) {
    return {
      title: "Profile Name Required",
      description: "A profile name must be specified to create your account.",
      suggestion: "Please enter your first and last name in the field provided above."
    };
  }

  if (err.includes('google sign-in request was cancelled') || err.includes('popup-closed-by-user')) {
    return {
      title: "Sign-In Cancelled",
      description: "The Google authentication popup window was closed before completing the process.",
      suggestion: "If you'd like to use Google, please click the button again and keep the login window open until finished."
    };
  }

  return {
    title: "Authentication Alert",
    description: errorStr,
    suggestion: "Double-check your credentials and connection, then try again."
  };
};

const LoginErrorDisplay: React.FC<{ error: string; onClear: () => void }> = ({ error, onClear }) => {
  if (!error) return null;
  const { title, description, suggestion } = translateAuthError(error);

  return (
    <div id="login-error-card" className="relative overflow-hidden rounded-xl border border-rose-50 bg-rose-50/75 p-4 text-xs text-rose-950 transition-all duration-300 dark:border-rose-950/40 dark:bg-rose-950/10 dark:text-rose-100">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 rounded-full bg-rose-50 p-1 text-rose-500 dark:bg-rose-950/80 dark:text-rose-300">
          <svg className="h-3.5 w-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-bold tracking-tight text-rose-800 dark:text-rose-200">{title}</h4>
          <p className="text-[11px] leading-normal opacity-90 text-rose-700 dark:text-rose-300">{description}</p>
          {suggestion && (
            <p className="text-[11px] font-semibold leading-normal mt-1 border-t border-rose-50/50 pt-1 text-indigo-600 dark:border-rose-950/30 dark:text-indigo-300">
              💡 <span className="font-bold">Tip:</span> {suggestion}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-2 rounded-md p-1 text-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-200 cursor-pointer"
          title="Dismiss Error"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login, register, loginWithGoogle, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Fields state
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [simulatedResetUrl, setSimulatedResetUrl] = useState('');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      setIsForgotPassword(true);
    }
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [simulatedVerificationUrl, setSimulatedVerificationUrl] = useState('');
  const [smtpError, setSmtpError] = useState('');

  // Auto direct if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const isAdminUser = user.role === 'admin';
      if (isAdminUser) {
        showToast("Welcome back, Administrator. Redirecting to control panel.", "success", 4000, "User Action");
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

    
    if (isForgotPassword && !resetToken) {
      if (!email) {
        setAuthError('Please enter your email address to reset your password.');
        setSubmitting(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (data.success) {
          setForgotPasswordSuccess(true);
          showToast(data.message, 'success', 5000, "User Action");
          if (data.resetUrlSimulated) {
            setSimulatedResetUrl(data.resetUrlSimulated);
          }
        } else {
          setAuthError(data.error || 'Failed to request password reset.');
        }
      } catch (e) {
        setAuthError('Network error occurred.');
      }
      setSubmitting(false);
      return;
    }

    if (isForgotPassword && resetToken) {
      if (!password || password.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        setSubmitting(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword: password })
        });
        const data = await response.json();
        if (data.success) {
          showToast(data.message, 'success', 5000, "User Action");
          setIsForgotPassword(false);
          setResetToken(null);
          setActiveTab('login');
          setPassword('');
        } else {
          setAuthError(data.error || 'Failed to reset password.');
        }
      } catch (e) {
        setAuthError('Network error occurred.');
      }
      setSubmitting(false);
      return;
    }

    if (activeTab === 'login') {
      const validation = loginSchema.safeParse({ email, password });
      if (!validation.success) {
        const errorMsg = validation.error.issues[0]?.message || 'Please check your login details.';
        setAuthError(errorMsg);
        showToast(errorMsg, 'warning', 4000, "User Action");
        setSubmitting(false);
        return;
      }

      const res = await login(email, password);
      if (!res.success) {
        const errorMsg = res.error || 'The credentials you entered are incorrect. Please verify and try again.';
        setAuthError(errorMsg);
        showToast(errorMsg, 'error', 4000, "User Action");
        if (res.verificationUrlSimulated) {
          setSimulatedVerificationUrl(res.verificationUrlSimulated);
        }
      } else {
        showToast('Successfully verified credentials. Welcome back to your affiliate portal!', 'success', 4000, "User Action");
      }
    } else {
      const validation = registerSchema.safeParse({ email, password, name });
      if (!validation.success) {
        const errorMsg = validation.error.issues[0]?.message || 'Please check your registration details.';
        setAuthError(errorMsg);
        showToast(errorMsg, 'warning', 4000, "User Action");
        setSubmitting(false);
        return;
      }

      const res = await register(email, password, name);
      if (!res.success) {
        const errorMsg = res.error || 'The system was unable to complete your registration. Please check inputs and try again.';
        setAuthError(errorMsg);
        showToast(errorMsg, 'error', 4000, "User Action");
      } else {
        const successMsg = res.message || 'Your account is registered successfully! A verification link has been sent to your email.';
        showToast(successMsg, 'success', 6000, "User Action");
        setRegisteredEmail(email);
        if (res.verificationUrlSimulated) {
          setSimulatedVerificationUrl(res.verificationUrlSimulated);
        }
        if (res.smtpError) {
          setSmtpError(res.smtpError);
        }
        if (subscribeNewsletter) {
          try {
            await apiFetch('/api/newsletter/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
          } catch (err) {
            console.warn('Registration silent newsletter subscription failed:', err);
          }
        }
      }
    }
    setSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setAuthError('');
    const res = await loginWithGoogle();
    if (!res.success) {
      const errorMsg = res.error || 'The Google Sign-In request was cancelled or declined.';
      setAuthError(errorMsg);
      showToast(errorMsg, 'error', 4000, "User Action");
    } else {
      showToast('Successfully authenticated through secure Google Sign-In services!', 'success', 4000, "User Action");
      if (subscribeNewsletter && res.email && activeTab === 'register') {
        try {
          await apiFetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: res.email })
          });
        } catch (err: unknown) {
          console.warn('Google silent newsletter subscription failed:', err);
        }
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="flex-grow w-full mx-auto px-4 py-16 flex flex-col justify-center items-center gap-4 bg-slate-50 dark:bg-black">
      
      {/* High Visibility Floating Back Button */}
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2 rounded-full border border-slate-100 bg-white px-5 py-2 text-xs font-bold text-slate-600 hover:text-indigo-500 shadow-sm transition-all duration-300 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Store Home</span>
      </button>

      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-md dark:bg-slate-800 dark:border-slate-700 space-y-6">
        
        {/* Visual Brand Greeting */}
        <div className="text-center space-y-1.5 flex flex-col items-center">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
            <span className="text-zinc-900 dark:text-white font-display font-black">GADGETSPROHUB</span>
            <span className="text-slate-300 dark:text-slate-400 font-bold">MEMBER PORTAL</span>
          </h2>
          <h1 className="text-lg font-black text-slate-800 dark:text-white">
            {activeTab === 'login' ? 'Welcome Back, Explorer' : 'Create New Account'}
          </h1>
        </div>

        {/* Custom Toggle tabs */}
        <div className="flex border-b border-slate-50 p-0.5 bg-slate-50 rounded-xl dark:border-slate-700 dark:bg-slate-950 shrink-0">
          <button
            onClick={() => { setActiveTab('login'); setAuthError(''); setRegisteredEmail(''); setSimulatedVerificationUrl(''); setSmtpError(''); }}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 ${activeTab === 'login' ? 'bg-white shadow-xs text-indigo-500 dark:bg-slate-700' : 'text-slate-400'}`}
          >
            Access Sign In
          </button>
          <button
            onClick={() => { setActiveTab('register'); setAuthError(''); setRegisteredEmail(''); setSimulatedVerificationUrl(''); setSmtpError(''); }}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 ${activeTab === 'register' ? 'bg-white shadow-xs text-indigo-500 dark:bg-slate-700' : 'text-slate-400'}`}
          >
            Register Account
          </button>
        </div>

        {registeredEmail ? (
          <div id="registration-success-card" className="rounded-2xl border border-emerald-50 bg-emerald-50/75 p-4 text-xs text-emerald-950 dark:border-emerald-950/40 dark:bg-emerald-950/10 dark:text-emerald-100">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 rounded-full bg-emerald-50 p-1 text-emerald-500 dark:bg-emerald-950/80 dark:text-emerald-300">
                <svg className="h-3.5 w-3.5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l8-4a2 2 0 011.78 0l8 4A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-1.78 0L9 14.5" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-bold tracking-tight text-emerald-800 dark:text-emerald-200">Verification Link Sent</h4>
                <p className="text-[11px] leading-normal opacity-90 text-emerald-700 dark:text-emerald-300">
                  We have sent a verification email to <span className="font-bold">{registeredEmail}</span>. Please click the link inside to verify your identity.
                </p>
                {smtpError && (
                  <div className="mt-3 border-t border-amber-100/50 pt-2.5 space-y-1.5 dark:border-amber-950/20">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      ⚠️ SMTP Configuration Warning:
                    </p>
                    <p className="text-[10px] text-amber-700/90 dark:text-amber-300/90 leading-normal">
                      The mail server failed to deliver the email because Gmail requires an <span className="font-bold">App Password</span> (Google 2-Step Verification is active).
                    </p>
                    <p className="text-[10px] opacity-80 leading-normal">
                      To fix this, go to Google Account &rarr; Security &rarr; App passwords, generate a 16-character code, and use it as your <code className="font-mono bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded">SMTP_PASS</code> instead.
                    </p>
                  </div>
                )}
                {simulatedVerificationUrl && (
                  <div className="mt-3 border-t border-emerald-50/50 pt-2.5 space-y-1.5 dark:border-emerald-950/30">
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      🛠️ Sandbox Environment Simulator:
                    </p>
                    <p className="text-[10px] opacity-80 leading-normal">
                      Since mail servers are not active in sandbox environments, you can verify and auto-sign-in instantly by clicking below:
                    </p>
                    <a
                      href={simulatedVerificationUrl}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-emerald-400 transition-all duration-300 focus:outline-none cursor-pointer mt-1"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Verify & Auto-Sign-In Instantly
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          activeTab === 'login' && simulatedVerificationUrl && (
            <div id="login-verification-bypass-card" className="rounded-2xl border border-emerald-50 bg-emerald-50/75 p-4 text-xs text-emerald-950 dark:border-emerald-950/40 dark:bg-emerald-950/10 dark:text-emerald-100">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-full bg-emerald-50 p-1 text-emerald-500 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold tracking-tight text-emerald-800 dark:text-emerald-200">Email Verification Required</h4>
                  <p className="text-[11px] leading-normal opacity-90 text-emerald-700 dark:text-emerald-300">
                    The account for <span className="font-bold">{email}</span> is registered but needs email verification before logging in.
                  </p>
                  <div className="mt-3 border-t border-emerald-50/50 pt-2.5 space-y-1.5 dark:border-emerald-950/30">
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      🛠️ Sandbox Environment Simulator:
                    </p>
                    <p className="text-[10px] opacity-80 leading-normal">
                      Use this sandbox link to verify your account and sign in immediately:
                    </p>
                    <a
                      href={simulatedVerificationUrl}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-emerald-400 transition-all duration-300 focus:outline-none cursor-pointer mt-1"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Verify & Log In Instantly
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* Input Forms */}
                <form onSubmit={handleSubmit} className="space-y-4">
          <LoginErrorDisplay error={authError} onClear={() => setAuthError('')} />
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
            <>
              <AnimatePresence mode="popLayout" initial={false}>
                {activeTab === 'register' && (
                  <motion.div
                    key="register-name"
                    initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.3 }}
                    className="space-y-1.5"
                  >
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-300 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-100 bg-white p-2.5 pl-9 outline-none text-slate-950 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition-colors duration-300"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-300 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="buyer@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-100 bg-white p-2.5 pl-9 outline-none text-slate-950 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition-colors duration-300"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Secure Password</label>
                  {activeTab === 'login' && (
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-300 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-100 bg-white p-2.5 pl-9 pr-10 outline-none text-slate-950 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition-colors duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500 dark:hover:text-slate-100 focus:outline-none cursor-pointer transition-colors duration-300"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="popLayout" initial={false}>
                {activeTab === 'register' && (
                  <motion.div
                    key="register-newsletter"
                    initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-2.5 pt-1.5 pb-2.5 select-none" id="newsletter-login-opt-in"
                  >
                    <input
                      id="newsletter-subscribe-login"
                      type="checkbox"
                      checked={subscribeNewsletter}
                      onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-md border-slate-100 text-indigo-500 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-950 cursor-pointer transition-colors duration-300"
                    />
                    <label htmlFor="newsletter-subscribe-login" className="text-[11px] text-slate-400 dark:text-slate-300 leading-normal cursor-pointer font-medium transition-colors duration-300">
                      Subscribe to our newsletter to receive the latest tech updates, gadget price drops, and exclusive member discounts.
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 hover:shadow-xl text-white font-bold py-3 text-xs tracking-wider transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activeTab === 'login' ? 'login' : 'register'}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {submitting ? 'Verifying account...' : activeTab === 'login' ? 'Sign In Now' : 'Create Member Account'}
                  </motion.span>
                </AnimatePresence>
              </button>
            </>
          )}
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-50 dark:border-slate-700"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-wider text-slate-300">Authenticate with</span>
          <div className="flex-grow border-t border-slate-50 dark:border-slate-700"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 py-3 text-xs font-bold text-slate-600 dark:text-slate-200 transition-all duration-300 cursor-pointer active:scale-95"
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
          <p className="text-[10px] text-slate-300 dark:text-slate-400 uppercase tracking-widest font-bold">
            Secure Member Authentication
          </p>
        </div>

      </div>
    </div>
  );
};
