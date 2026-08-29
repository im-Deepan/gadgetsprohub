import React from 'react';
import { ShieldCheck, Lock, FileText, BarChart3, Megaphone, Cookie } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 mt-4">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-300 mb-2">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-xs font-mono text-indigo-500 dark:text-indigo-300 uppercase tracking-widest font-semibold">
          Transparency & Data Practices
        </p>
        <p className="max-w-xl mx-auto text-xs text-slate-400 dark:text-slate-300">
          Last revised: June 3, 2026. This policy outlines how we handle your data, use cookies, analyze site performance, and manage advertising relationships.
        </p>
      </div>

      <div className="space-y-8 bg-white border border-slate-50 rounded-3xl p-6 md:p-10 dark:bg-slate-800 dark:border-slate-700 shadow-xs">
        
        {/* Data Collection */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-400" />
            <span>1. Data Collection & Google Sign-In</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            We prioritize transparency in data collection. When you choose to authenticate via Google Sign-In, we securely request your basic profile information (such as your name and email address). This data is used to enable your secure personalized profile, synchronize your product Wishlist across devices, and maintain session continuity across page analytics and service features. You are never required to log in to browse the site. We do not collect sensitive personal information, identification documents, or payment details.
          </p>
        </section>

        {/* Cookies & Consent Controls */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <Cookie className="h-4 w-4 text-indigo-400" />
            <span>2. Cookies & User Consent Controls (GDPR / CCPA)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            We use essential cookies to maintain site functionality, such as remembering your theme preferences (light/dark mode) and managing your local wishlist items. Analytics telemetry and personalized Google AdSense advertising cookies are optional and require your explicit consent under GDPR and CCPA regulations.
          </p>
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-900/60 border border-indigo-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">Granular Consent & Opt-Out Management</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-300">Review your active cookie preferences or opt out of telemetry and personalized ads at any time.</p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open_cookie_settings'))}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shrink-0 shadow-xs"
            >
              Manage Preferences
            </button>
          </div>
        </section>

        {/* Analytics */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <span>3. Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            To better understand how our community interacts with content, optimize application performance, and provide tailored product insights, we collect interaction logs and usage analytics. This telemetry includes:
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-slate-200 space-y-1">
            <li>Exact page URLs visited and interaction timestamps.</li>
            <li>Button interactions and product affiliate link navigation.</li>
            <li>IP address, regional district information, user agent, and browser specs.</li>
            <li>Associated user identifier (userId) for signed-in sessions to track feature usage and platform health.</li>
          </ul>
        </section>

        {/* Advertising */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-indigo-400" />
            <span>4. Advertising & Affiliate Links</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            We utilize affiliate links and verified advertising partners (such as Google AdSense) for product recommendations and site monetization. Clicking a link or ad may redirect you to a third-party merchant or partner, which may use cookies and tracking mechanisms in accordance with standard privacy policies to attribute interactions or serve contextual advertisements.
          </p>
        </section>

        {/* Retention */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span>5. Data Retention & Transparency</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            Your interactions with this platform do not create persistent, identifiable profiles. Any contact logs or newsletter subscriptions are strictly used for their intended purpose and can be deleted or modified upon request via our contact desk.
          </p>
        </section>

        <div className="pt-6 border-t border-slate-50 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-300 italic">
            Thank you for trusting gadgetsprohub. We believe in honest, transparent digital navigation.
          </p>
        </div>
      </div>
    </div>
  );
};
