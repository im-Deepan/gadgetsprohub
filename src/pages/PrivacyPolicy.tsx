import React from 'react';
import { ShieldCheck, Lock, Eye, CheckCircle2, Globe, FileText, BarChart3, Megaphone, Cookie } from 'lucide-react';

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
            We prioritize minimalism in data collection. When you choose to authenticate via Google Sign-In, we securely request your basic profile information (such as your name and email address). This data is requested <strong>solely to enable your secure personalized profile and synchronize your product Wishlist</strong> across devices. You are never required to log in to browse the site. We do not collect sensitive personal information, identification documents, or payment details.
          </p>
        </section>

        {/* Cookies */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <Cookie className="h-4 w-4 text-indigo-400" />
            <span>2. Cookies</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            We use essential cookies to maintain site functionality, such as remembering your theme preferences (light/dark mode) and managing your local wishlist items. These cookies are not used for tracking your behavior across other websites.
          </p>
        </section>

        {/* Analytics */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <span>3. Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            To better understand how our community interacts with content, we use anonymized analytics. This includes monitoring:
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-slate-200 space-y-1">
            <li>Pages visited and time spent on page.</li>
            <li>Button clicks for product and referral links.</li>
            <li>Aggregated regional visitor counts (non-identifiable).</li>
            <li>Browser type and device screen resolution for layout optimization.</li>
          </ul>
        </section>

        {/* Advertising */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-indigo-400" />
            <span>4. Advertising & Affiliate Links</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            We utilize affiliate links for product recommendations. Clicking a link may redirect you to a third-party retailer, which may use its own tracking mechanisms and cookies to monitor your interaction and attribute any consequent purchases. Our advertising practices are limited to these transparent referral links; we do not display intrusive banner ads or serve third-party ad networks on this site.
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
