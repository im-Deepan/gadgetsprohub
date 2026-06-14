import React from 'react';
import { AlertTriangle, Gift, Info, FileWarning, ExternalLink, ShieldCheck } from 'lucide-react';

export const Disclaimer: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 mt-4 font-sans">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 mb-2">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl font-sans">
          Affiliate & Site Disclaimer
        </h1>
        <p className="text-xs font-mono text-amber-600 dark:text-amber-400 uppercase tracking-widest font-semibold">
          Regulatory Compliance Notices
        </p>
        <p className="max-w-xl mx-auto text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Last revised: June 3, 2026. This page details our active affiliate relationships, compensation structures, content intent, and trademark nominative fair-use guidelines.
        </p>
      </div>

      <div className="space-y-8 bg-white border border-slate-100 rounded-3xl p-6 md:p-10 dark:bg-slate-900 dark:border-slate-800 shadow-sm transition-all">
        {/* FTC Affiliate Disclosure */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Gift className="h-4 w-4 text-indigo-500" />
            <span>1. FTC Affiliate Disclosure Statement</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            In compliance with FTC (Federal Trade Commission) guidelines, please be informed that <span className="font-bold">gadgetsprohub</span> is a professional product review and comparison platform.
          </p>
          <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100/30 text-indigo-900 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-300">
            <p className="text-xs leading-relaxed font-medium">
              We frequently include outbound store referral tags (affiliate links) on our product specification listings. Clicking an outbound store action to buy an accessory occasionally results in our platform receiving a small percentage commission from the vendor (e.g. Amazon Associate commissions, affiliate networks). 
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              This commission comes at <span className="font-bold text-indigo-700 dark:text-indigo-300">absolutely no additional cost to you</span>. It directly supports our hosting infrastructure and editorial staff to perform continuous audits, spec indexing, and comparison updates. We only catalog brands whose warranty standards, refund mechanisms, and overall reliability are proven in global e-commerce.
            </p>
          </div>
        </section>

        {/* Content Purpose - Not Professional Advice */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Info className="h-4 w-4 text-indigo-500" />
            <span>2. No Professional Advice or Endorsement</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            All reviews, comparison scoring, checklists, and highlights (pros and cons) documented on gadgetsprohub represent standard consumer evaluation research. They are designed exclusively for informational and educational purposes. 
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
            Our content is not legal, financial, architectural, athletic training, or professional consultation advice. You should verify your local fitness conditions or electrical parameters (such as safety wattages and voltage specifications) against official manufacturer guidelines before using any physical gear.
          </p>
        </section>

        {/* Content Accuracy & Outbound Integrity */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-indigo-500" />
            <span>3. Outbound Link & Third-Party Actions</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            When you click on our buttons or links, you are directed to retail partner sites. We have no responsibility or authority over the availability of their inventory, checkout performance, delivery operations, billing safety, or regional laws.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
            We exclude any express or implied warranties concerning merchantability, fitness for a specific purpose on third-party sites, or the security of payments handled by external payment gateways.
          </p>
        </section>

        {/* Nominative Fair Use */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            <span>4. Trademark & Media Fair-Use Statement</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            All trademark titles (such as Apple, Samsung, Sony, AudioPro, Nike, etc.) and associated product mock photos/specifications are the intellectual properties of their respective trademark holders. gadgetsprohub references these names and specifications purely under nominative fair-use exceptions to identify, contrast, and review consumer goods. We have no direct endorsement, official partnership, or corporate sponsorship with actual manufacturers unless explicitly documented on a specific review.
          </p>
        </section>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400">
          For any copyright, DMCA, or partnership inquiries regarding this disclaimer, please direct mail us: support@gadgetsprohub.com
        </div>
      </div>
    </div>
  );
};
