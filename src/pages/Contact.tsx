import React, { useState } from 'react';
import { Mail, Send, MessageSquareText, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
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

  // Submission alert overlays
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Extract the first error message
      const firstError = result.error.issues[0]?.message || 'Invalid form input.';
      setErrorMessage(firstError);
      setShowErrorModal(true);
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
      const data = await res.json();
      
      if (!res.ok) {
        const errMsg = data.error || 'Server was unable to register the message query.';
        const friendly = mapErrorToFriendly(errMsg, 'submit your contact request');
        setErrorMessage(friendly.message);
        setShowErrorModal(true);
        setSubmitting(false);
        return;
      }

      setSuccessDetail('Your communication inquiry has been submitted successfully. A specialized research analyst has been assigned to your query and will contact you via email within 24 business hours.');
      setShowSuccessModal(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      const friendly = mapErrorToFriendly(e, 'submit your contact request');
      setErrorMessage(friendly.message);
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-300">
      
      {/* Page Header */}
      <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-200">
          <MessageSquareText className="h-4 w-4" />
          Contact Support
        </span>
        <h1 className="text-2xl sm:text-3.5xl font-extrabold font-sans text-slate-800 tracking-tight dark:text-white">Get in Touch</h1>
        <p className="text-sm text-slate-500 leading-relaxed dark:text-slate-300">
          Have a question about a product, feedback, or a partnership inquiry? We'd love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 md:px-4">
        
        {/* Left column: Contact info cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/40 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-700">Support channels</h3>
            
            <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-300">
              Reach out directly to our team for help with product reviews, specifications, or general inquiries.
            </p>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3.5 text-slate-600 dark:text-slate-200">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Editorial & Support Team</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-0.5 break-all sm:break-normal">support@example.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Statement */}
          <div className="rounded-2xl bg-amber-50/50 p-5 border border-amber-100 flex gap-3 text-amber-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">Your privacy is safe with us</h4>
              <p className="text-xs text-slate-600 mt-1 dark:text-slate-300 leading-relaxed">Your message and contact information are confidential. We never share your details with third parties.</p>
            </div>
          </div>
        </div>

        {/* Right column: Form Card */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs dark:border-slate-700 dark:bg-zinc-800/30">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 font-sans">Send us a message</h3>

          <form onSubmit={handleMessageSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="contact-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  id="contact-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
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
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-subject" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                <input
                  id="contact-subject"
                  name="subject"
                  autoComplete="off"
                  type="text"
                  required
                  placeholder="How can we help?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-message" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Message</label>
              <textarea
                id="contact-message"
                name="message"
                autoComplete="off"
                required
                rows={5}
                placeholder="Write your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-3 shadow-xs transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Success Modal Dialogue */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-50 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-zinc-800 transition-all duration-300 text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal-50 text-teal-500 dark:bg-teal-950/30 rounded-full shrink-0">
                <ShieldCheck className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-1 my-1">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-sans">Message Received</h3>
                <p className="text-xs text-slate-400 dark:text-slate-300 font-medium leading-relaxed font-sans whitespace-pre-wrap">
                  {successDetail || 'Your inquiry was submitted successfully! Our expert research editors will review the requested specifications shortly.'}
                </p>
              </div>
            </div>
            
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-lg bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 text-xs font-bold shadow-sm transition-all duration-300 active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal Dialogue */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-50 bg-white p-6 shadow-xl dark:border-rose-950/20 dark:bg-zinc-800 transition-all duration-300 text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-500 dark:bg-rose-950/30 rounded-full shrink-0">
                <AlertTriangle className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-1 my-1">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-sans text-rose-500">Review Required</h3>
                <p className="text-xs text-slate-400 dark:text-slate-300 font-medium leading-relaxed font-sans whitespace-pre-wrap">
                  {errorMessage || "We encountered an issue recording your inquiry specifications."}
                </p>
              </div>
            </div>
            
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white py-2 px-4 text-xs font-bold shadow-sm transition-all duration-300 active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
