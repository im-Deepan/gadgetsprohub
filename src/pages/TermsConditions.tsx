import React from 'react';
import { Scale, ShieldCheck, HelpCircle, FileText, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const TermsConditions: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 mt-4 font-sans">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-2">
          <Scale className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl font-sans">
          Terms & Conditions
        </h1>
        <p className="text-xs font-mono text-indigo-640 dark:text-indigo-400 uppercase tracking-widest font-semibold">
          Affiliate Platform Usage Rules
        </p>
        <p className="max-w-xl mx-auto text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Last updated: June 3, 2026. Please read these terms carefully before exploring or interactively using the gadgetsprohub platform.
        </p>
      </div>

      <div className="space-y-8 bg-white border border-slate-100 rounded-3xl p-6 md:p-10 dark:bg-slate-900 dark:border-slate-800 shadow-sm transition-all">
        {/* Acceptance of Terms */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
            <span>1. Acceptance of Terms</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            By accessing or using gadgetsprohub (including browsing product lists, Reading analytical reviews, or using dynamic stores referral tags), you represent that you have read, understood, and agreed to be legally bound by these terms. If you do not agree, please do not use our services.
          </p>
        </section>

        {/* Affiliate Link Relationships */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-500" />
            <span>2. Affiliate Links & Redirects</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Our platform contains product lists coupled with deep referral tags (affiliate links). Clicking an affiliate button redirects you to external e-commerce vendor portals (e.g., Amazon, Nike, target). 
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1 mt-1">
            <li>We do not control, manipulate, or maintain third-party retailer operations.</li>
            <li>We do not process, track, or handle payments, shipments, refunds, or customer support issues for products purchased from third-party vendor sites.</li>
            <li>Your interactions and purchases on vendor platforms are governed solely by those respective organizations Terms & Conditions and Privacy Policies.</li>
          </ul>
        </section>

        {/* Pricing Mismatches & Specification Accuracies */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-indigo-500" />
            <span>3. Product Specifications & Pricing</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            While we try to maintain absolute precision in listing technical specifications, prices, original prices, discounts, and inventory availability, data points can change quickly on merchant outlets.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
            All prices and parameters cataloged on gadgetsprohub are in-moment references and are provided "as is" and "as available". The final active price and specification visible on the merchant's portal during checkout represents the binding value.
          </p>
        </section>

        {/* Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" />
            <span>4. Intellectual Property Rights</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            All proprietary text reviews, technical specifications analysis, interface layouts, vector branding designs, and code structures are creative properties of gadgetsprohub. Product photos, trademarks, logos, and specific manufacturer specifications are owned by their respective third-party brands and are referenced here under nominative fair-use principles to identify and compare items.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-500" />
            <span>5. Limitation of Liability</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-1">
            In no event shall gadgetsprohub, its editors, developers, or affiliates be liable for any direct, indirect, incidental, consequential, special, or exemplary damages arising out of or in connection with:
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <li>Any dynamic pricing or parameter discrepancies.</li>
            <li>Any hardware faults, software defects, shipping delays, or physical damages resulting from products purchased through third-party affiliate store links.</li>
            <li>Temporary platform out-of-services or database notice offline periods.</li>
          </ul>
        </section>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400">
          Should you require any clarifications regarding these rules, feel free to pitch our legal box: supportataffiliateprohub@gmail.com
        </div>
      </div>
    </div>
  );
};
