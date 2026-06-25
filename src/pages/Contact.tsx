import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquareText, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseMock, OperationType, handleFirestoreError } from '../firebase';
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
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successDetail, setSuccessDetail] = useState('');

  // Diagnostic feeding/submission alert overlays
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccess(false);

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
      setErrorMsg(firstError);
      setErrorMessage(firstError);
      setShowErrorModal(true);
      setSubmitting(false);
      return;
    }

    const validatedData = result.data;

    try {
      // 1. Submit to main API server proxy (which handles MongoDB/Local state)
      const res = await apiFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData)
      });
      const data = await res.json();
      
      if (!res.ok) {
        const errMsg = data.error || 'Server was unable to register the message query.';
        const friendly = mapErrorToFriendly(errMsg, 'submit your contact request');
        setErrorMsg(friendly.message);
        setErrorMessage(friendly.message);
        setShowErrorModal(true);
        setSubmitting(false);
        return;
      }

      // 2. Persist to real Firestore database if active
      if (!isFirebaseMock) {
        const messageDocRef = doc(collection(db, 'messages'));
        const messageId = messageDocRef.id;
        
        const payload: any = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
          createdAt: serverTimestamp()
        };

        if (phone && phone.trim()) {
          payload.phone = phone.trim();
        }

        // Persist to Firestore in the background so slow connections or rule checks never block the main submission
        setDoc(messageDocRef, payload)
          .then(() => {
            console.log('Successfully recorded contact message in live Firestore database:', messageId);
            setSuccessDetail('Your communication inquiry has been submitted successfully. A specialized research analyst has been assigned to your query and will contact you via email within 24 business hours.');
          })
          .catch((fErr: any) => {
            console.warn('Optional Firestore background logging failed:', fErr.message || fErr);
            setSuccessDetail('Your communication response has been processed successfully. A specialized research analyst has been assigned to your query and will email you back shortly.');
          });
      } else {
        setSuccessDetail('Your communication inquiry has been submitted successfully. A specialized research analyst has been assigned to your query and will contact you via email within 24 business hours.');
      }

      setSuccess(true);
      setShowSuccessModal(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      const friendly = mapErrorToFriendly(err, 'submit your contact request');
      setErrorMsg(friendly.message);
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          <MessageSquareText className="h-4 w-4" />
          The Help Desk
        </span>
        <h1 className="text-2xl sm:text-3.5xl font-black font-sans text-slate-900 tracking-tight dark:text-white">Get in Touch With Editors</h1>
        <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
          Have product specifications queries, requests to evaluate custom workout tech, or queries concerning affiliate coupons? Write us directly!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 md:px-4">
        
        {/* Left column: Contact info cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white pb-3 border-b dark:border-slate-800">Support channels</h3>
            
            <p className="text-[11px] text-slate-500 leading-relaxed dark:text-slate-400">
              For any specification queries, product reviews request, or affiliate partnership questions, feel free to pitch us through our direct email boxes.
            </p>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3.5 text-slate-700 dark:text-slate-300">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold">Editorial & Support Help Desk</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">support@gadgetsprohub.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Card */}
          <div className="rounded-2xl bg-amber-50/40 p-5 border border-amber-100/30 flex gap-3 text-amber-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider">Secure Communication Statement</h4>
              <p className="text-[10px] text-slate-500 mt-1 dark:text-slate-400 leading-normal">Your information is governed by private SSL rules. We never dispatch customer messages metadata to third-party ad brokers.</p>
            </div>
          </div>
        </div>

        {/* Right column: Form Card */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-zinc-900/30">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 font-sans">Send Secure Inquire Message</h3>

          <form onSubmit={handleMessageSubmit} className="space-y-4">
            {success && (
              <div className="rounded-xl bg-teal-50 p-4 text-xs text-teal-800 dark:bg-teal-950/30 dark:text-teal-300">
                <span className="font-bold block mb-0.5">✓ Thank you, message submitted!</span>
                Our support team will research specifications and email you back.
              </div>
            )}
            {errorMsg && (
              <div className="rounded-xl bg-rose-50 p-4 text-xs text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="contact-name" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-900 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  placeholder="e.g. buyer@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-900 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="contact-phone" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone (Optional)</label>
                <input
                  id="contact-phone"
                  type="tel"
                  placeholder="+1 (206) ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-900 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-subject" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject Of Inquiry</label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  placeholder="e.g. Headphone specification mismatch"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-900 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-message" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descriptive Message Body</label>
              <textarea
                id="contact-message"
                required
                rows={5}
                placeholder="Include key specs fields or the product slug for detailed reviews..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none text-slate-900 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Submitting query...' : 'Submit Inquiry'}
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Success Modal Dialogue */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-zinc-900 transition-all text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal-50 text-teal-600 dark:bg-teal-950/30 rounded-full shrink-0">
                <ShieldCheck className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-1 my-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-sans">Message Received</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans whitespace-pre-wrap">
                  {successDetail || 'Your inquiry was submitted successfully! Our expert research editors will review the requested specifications shortly.'}
                </p>
              </div>
            </div>
            
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
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
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-100 bg-white p-6 shadow-xl dark:border-rose-950/20 dark:bg-zinc-900 transition-all text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/30 rounded-full shrink-0">
                <AlertTriangle className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-1 my-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-sans text-rose-600">Review Required</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans whitespace-pre-wrap">
                  {errorMessage || "We encountered an issue recording your inquiry specifications."}
                </p>
              </div>
            </div>
            
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
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
