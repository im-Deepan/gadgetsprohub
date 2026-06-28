import React from 'react';
import { Users, ShieldCheck, Heart, Award, CheckCircle2, ChevronRight, Mail } from 'lucide-react';

export const AboutUs: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 mt-4">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-300 mb-2">
          <Users className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white sm:text-4xl font-sans">
          About Us
        </h1>
        <p className="text-xs font-mono text-indigo-500 dark:text-indigo-300 uppercase tracking-widest font-semibold">
          Independent Reviews & Spec Mapping
        </p>
        <p className="max-w-xl mx-auto text-xs text-slate-400 dark:text-slate-300 leading-relaxed">
          Welcome to <span className="font-bold text-slate-600 dark:text-slate-200">gadgetsprohub</span>. We deliver honest, data-backed reviews and specifications for electronic gear, smart home assistants, lifestyle wear, and athletic devices.
        </p>
      </div>

      <div className="space-y-8 bg-white border border-slate-50 rounded-3xl p-6 md:p-10 dark:bg-slate-800 dark:border-slate-700 shadow-sm transition-all">
        {/* Mission */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-400" />
            <span>Our Core Mission</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            In a web landscape filled with thin content and sponsored listings, finding objective specifications and verified reviews is difficult. We founded <span className="font-bold">gadgetsprohub</span> to aggregate key metrics, provide explicit comparison charts, and share curated, tested feedback so you can buy with confidence.
          </p>
        </section>

        {/* Reviewing Process */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>How We Evaluate Products</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            We follow a rigorous three-step product assessment criteria:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-50 dark:border-slate-700">
              <span className="text-lg font-black text-indigo-500 font-mono">01</span>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-100 mt-1 mb-1">Spec Mapping</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-300 leading-relaxed">We extract complete technical parameters (battery, build materials, firmware, wireless chipsets) and catalog them into structured maps.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-50 dark:border-slate-700">
              <span className="text-lg font-black text-indigo-500 font-mono">02</span>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-100 mt-1 mb-1">Pros & Cons Auditing</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-300 leading-relaxed">We scour through thousands of user forums and review boards to distill genuine purchase feedback, identifying true drawbacks and advantages.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-50 dark:border-slate-700">
              <span className="text-lg font-black text-indigo-500 font-mono">03</span>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-100 mt-1 mb-1">Affiliate Integrity</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-300 leading-relaxed">We provide direct buying routes, fully disclosing our referral models. We choose partners purely based on stock availability and consumer safety.</p>
            </div>
          </div>
        </section>

        {/* Editorial Independence */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <Heart className="h-4 w-4 text-indigo-400" />
            <span>Editorial Independence & Safety</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-200 leading-relaxed">
            Our reviews are entirely self-funded and completely separate from any advertising agreements. No manufacturer has a say in our ratings, highlights, or specifications checklists. We place our users interest first, ensuring our comparison engine behaves neutrally.
          </p>
        </section>

        {/* Contact info support */}
        <div className="pt-6 border-t border-slate-50 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white font-sans">Have questions or want us to audit a product?</h4>
            <p className="text-[10px] text-slate-300 mt-0.5">We respond to specifications, feedback, and manufacturer reviews requests.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3.5 py-2 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Mail className="h-3.5 w-3.5" />
              <span>support@gadgetsprohub.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
