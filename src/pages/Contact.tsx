import React, { useState } from 'react';
import { Mail, Send, MessageSquareText, ShieldAlert, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { mapErrorToFriendly } from '../utils/errorMapper';
import { contactSchema } from '../utils/schemas';
import { apiFetch } from '../utils/apiClient';

export const Contact: React.FC = () => {
  // States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [successDetail, setSuccessDetail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ title: string; message: string; suggestion?: string } | null>(null);

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccessDetail('');
    setSubmitting(true);

    // Run type-safe Zod validation
    const result = contactSchema.safeParse({
      name,
      email,
      phone: phone || undefined,
      subject: subject || undefined,
      message
    });

    if (!result.success) {
      const errorsMap: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        const fieldName = issue.path[0] as string;
        if (fieldName && !errorsMap[fieldName]) {
          errorsMap[fieldName] = issue.message;
        }
      });

      setFieldErrors(errorsMap);
      const firstError = result.error.issues[0]?.message || 'Please review the fields marked in red.';
      setFormError({
        title: 'Please check your inputs',
        message: firstError,
        suggestion: 'Verify all required fields have valid formatting before sending.'
      });
      setSubmitting(false);
      return;
    }

    const validatedData = result.data;

    try {
      // 1. Submit to main API server proxy
      const res = await apiFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData)
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        const errMsg = data.error || 'Server was unable to register the message query.';
        const friendly = mapErrorToFriendly(errMsg, 'submit your contact request');
        setFormError({
          title: 'Submission Issue',
          message: friendly.message,
          suggestion: 'Please try again in a few moments or check your internet connection.'
        });
        setSubmitting(false);
        return;
      }

      setSuccessDetail('Your message has been sent successfully. Our support team will review your inquiry and get back to you within 24 hours.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
      setFieldErrors({});
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      const friendly = mapErrorToFriendly(e, 'submit your contact request');
      setFormError({
        title: 'Communication Interrupted',
        message: friendly.message,
        suggestion: 'Ensure your internet connection is active and click Try Again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-300 font-sans">
      
      {/* Page Header */}
      <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-200">
          <MessageSquareText className="h-4 w-4" />
          Contact Support
        </span>
        <h1 className="text-2xl sm:text-3.5xl font-extrabold font-sans text-slate-900 tracking-tight dark:text-white">Get in Touch</h1>
        <p className="text-sm text-slate-600 leading-relaxed dark:text-slate-300">
          Have a question about a product, feedback, or a partnership inquiry? We'd love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 md:px-4">
        
        {/* Left column: Contact info cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">Support channels</h3>
            
            <p className="text-xs text-slate-600 leading-relaxed dark:text-slate-300">
              Reach out directly to our team for help with product reviews, specifications, or general inquiries.
            </p>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3.5 text-slate-700 dark:text-slate-200">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Email Inquiry</p>
                  <p className="font-bold text-slate-900 dark:text-white">support@gadgetsprohub.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Statement */}
          <div className="rounded-2xl bg-amber-50/70 p-5 border border-amber-200/60 flex gap-3 text-amber-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 shadow-xs">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Your privacy is safe with us</h4>
              <p className="text-xs text-slate-600 mt-1 dark:text-slate-300 leading-relaxed">Your message and contact information are confidential. We never share your details with third parties.</p>
            </div>
          </div>
        </div>

        {/* Right column: Form Card */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 font-sans">Send us a message</h3>

          {/* Success Banner */}
          {successDetail && (
            <div 
              role="alert" 
              className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100 flex items-start gap-3"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Message Received</h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">{successDetail}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSuccessDetail('')}
                className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {formError && (
            <div 
              role="alert" 
              className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-100 flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">{formError.title}</h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">{formError.message}</p>
                {formError.suggestion && (
                  <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 pt-1">
                    💡 <span className="font-bold">Recommendation:</span> {formError.suggestion}
                  </p>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setFormError(null)}
                className="text-rose-600 hover:text-rose-800 dark:text-rose-400 p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleMessageSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="contact-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  type="text"
                  required
                  placeholder="e.g. Alex Miller"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                  }}
                  className={`w-full text-xs rounded-xl border bg-white p-3 outline-none text-slate-900 transition-colors dark:bg-slate-950 dark:text-white ${
                    fieldErrors.name 
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                      : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-0.5">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                  }}
                  className={`w-full text-xs rounded-xl border bg-white p-3 outline-none text-slate-900 transition-colors dark:bg-slate-950 dark:text-white ${
                    fieldErrors.email 
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                      : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-0.5">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="contact-phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone (Optional)</label>
                <input
                  id="contact-phone"
                  name="phone"
                  autoComplete="tel"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white p-3 outline-none text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-subject" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  autoComplete="off"
                  type="text"
                  required
                  placeholder="How can we help?"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (fieldErrors.subject) setFieldErrors(prev => ({ ...prev, subject: '' }));
                  }}
                  className={`w-full text-xs rounded-xl border bg-white p-3 outline-none text-slate-900 transition-colors dark:bg-slate-950 dark:text-white ${
                    fieldErrors.subject 
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                      : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
                {fieldErrors.subject && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-0.5">{fieldErrors.subject}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-message" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                autoComplete="off"
                required
                rows={5}
                placeholder="Write your question, gear recommendation request, or feedback here..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (fieldErrors.message) setFieldErrors(prev => ({ ...prev, message: '' }));
                }}
                className={`w-full text-xs rounded-xl border bg-white p-3 outline-none text-slate-900 transition-colors dark:bg-slate-950 dark:text-white ${
                  fieldErrors.message 
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                    : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              {fieldErrors.message && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-0.5">{fieldErrors.message}</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                id="contact-submit-btn"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-3 shadow-xs transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending Inquiry...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
};
