import React from 'react';
import {
  ShieldCheck,
  Lock,
  FileText,
  BarChart3,
  Megaphone,
  Cookie,
  Sliders,
  ExternalLink,
  Globe,
  CheckCircle2,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  const openCookiePreferences = () => {
    window.dispatchEvent(new CustomEvent('open_cookie_settings'));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 mt-4 font-sans text-slate-800 dark:text-slate-100">
      {/* Page Header */}
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-2 border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
          Privacy Policy &amp; AdSense Disclosures
        </h1>
        <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-semibold">
          Transparency • Cookie Controls • User Consent • GDPR, CCPA &amp; AdSense TOS Section 10
        </p>
        <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Last revised: September 3, 2026. This comprehensive Privacy Policy explains how <span className="font-semibold text-slate-800 dark:text-slate-200">gadgetsprohub</span>, referred to as we, us, or our, collects, uses, stores, accesses, and protects your information, detailing our full compliance with the Google AdSense Online Terms of Service — specifically Section 10 on Privacy — Google AdSense Program Policies, the EU User Consent Policy, and global privacy frameworks.
        </p>
      </div>

      {/* Quick Action & Opt-Out Hub */}
      <div className="mb-8 p-5 rounded-3xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-white border border-indigo-100 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-indigo-950/30 dark:border-slate-700 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
              <Sliders className="h-3 w-3" /> Quick Privacy Controls
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Manage Your Cookie &amp; Advertising Preferences
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              You have full autonomy over cookies, analytics telemetry, and personalized Google AdSense advertising. Modify or revoke your consent anytime.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openCookiePreferences}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <Cookie className="h-3.5 w-3.5" />
              <span>Cookie Preferences</span>
            </button>
            <button
              type="button"
              onClick={openCookiePreferences}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors border border-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600 active:scale-95"
            >
              Do Not Sell or Share My Info
            </button>
          </div>
        </div>
      </div>

      {/* Main Legal Content Container */}
      <div className="space-y-10 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 md:p-12 dark:bg-slate-800/80 dark:border-slate-700 shadow-xs">
        
        {/* Section 1: Relationship with Google & AdSense Online Terms of Service */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>1. Relationship with Google &amp; AdSense Terms of Service — Section 10 Compliance</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            gadgetsprohub participates in the <span className="font-semibold text-slate-800 dark:text-slate-100">Google AdSense</span> program operated by Google Asia Pacific Pte. Ltd. / Google LLC, designated as Google. In compliance with <span className="font-semibold text-slate-800 dark:text-slate-100">Section 10 on Privacy of the Google AdSense Online Terms of Service</span>:
          </p>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed">
              &quot;You will ensure that at all times you use the Services, the Properties have a clearly labeled and easily accessible privacy policy that provides end users with clear and comprehensive information about cookies, device-specific information, location information and other information stored on, accessed on, or collected from end users&apos; devices in connection with the Services, including, as applicable, information about end users&apos; options for cookie management. You will use commercially reasonable efforts to ensure that an end user gives consent to the storing and accessing of cookies, device-specific information, location information or other information on the end user&apos;s device in connection with the Services where such consent is required by law.&quot;
            </p>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Both gadgetsprohub and Google adhere to the <span className="font-semibold text-slate-800 dark:text-slate-100">Google Ads Controller-Controller Data Protection Terms</span>. Under these terms, Google acts as an independent data controller when delivering advertising, calculating impressions, measuring ad performance, preventing invalid activity, and developing advertising products.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            For detailed information on how Google collects, protects, and uses information when you visit sites that display Google Ads, please review Google&apos;s designated resource:{' '}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              How Google uses information from sites or apps that use our services <ExternalLink className="h-3 w-3" />
            </a>.
          </p>
        </section>

        {/* Section 2: Clear & Comprehensive Information on Cookies */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <Cookie className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>2. Comprehensive Information on Cookies &amp; Third-Party Vendors</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            A cookie is a small piece of data stored in text format that a website asks your browser to store on your device in order to remember information about you, such as your language preference, active session, or theme choice.
          </p>
          
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
              Mandatory Google AdSense Disclosures
            </h4>
            <ul className="list-disc pl-5 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5 leading-relaxed">
              <li>
                <span className="font-semibold">Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior visits to your website or other websites on the Internet.</span>
              </li>
              <li>
                <span className="font-semibold">Google&apos;s use of advertising cookies, such as DoubleClick cookies, enables it and its partners to serve ads to your users based on their visit to your sites and other sites across the Internet.</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Categories of Cookies Stored On or Accessed From Your Device:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Strictly Essential</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">Active</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Required for site navigation, security, CSRF protection, remembering your light/dark theme preference, and maintaining your local gadget wishlist. Cannot be turned off.
                </p>
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-400">
                  Examples: <code>cookie_consent</code>, <code>cookie_preferences</code>, <code>theme</code>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Analytics & Telemetry</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300">Configurable</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Measures page view counts, aggregate time spent exploring technical specs, user interaction frequencies, and diagnostic crash logs to improve platform performance.
                </p>
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-400">
                  Examples: anonymous page duration tokens, aggregate query counters.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Google AdSense & Partners</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300">Configurable</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Used by Google AdSense and certified ad technology vendors to deliver relevant contextual and interest-based promotions, prevent ad fatigue, and detect click manipulation.
                </p>
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-400">
                  Examples: <code>__gads</code>, <code>__gpi</code>, <code>IDE</code>, <code>DSID</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Device-Specific Information */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <Sliders className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>3. Device-Specific Information Stored On, Accessed On, or Collected</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            In connection with serving the Services and displaying advertising content, gadgetsprohub and its advertising partners, primarily Google, may store, access, or collect device-specific information from your hardware, including:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Hardware &amp; System Architecture:</span> Device model, hardware type — desktop computer, mobile phone, or tablet — processor architecture, operating system vendor and version including Android, iOS, Windows, macOS, and Linux.
            </li>
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Browser &amp; Application Details:</span> Web browser engine and version such as Chrome, Safari, Firefox, and Edge, user-agent string, language preference headers, and active feature support.
            </li>
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Display Characteristics:</span> Screen resolution, device pixel ratio, color depth, and viewport dimensions — critical for rendering responsive display banner ads with high visual clarity.
            </li>
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Network &amp; Connectivity Signals:</span> Protocol version including HTTP/2 and HTTP/3, connection type, and telemetry metrics utilized to verify that traffic originates from legitimate human users rather than automated web scrapers.
            </li>
          </ul>
        </section>

        {/* Section 4: Location Information */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>4. Location Information</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            When you interact with gadgetsprohub, we and Google may determine your approximate geographic location — such as country, administrative state or region, city, or general postal district — through your Internet Protocol IP address.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Purpose of Location Processing:</span> Location data is used strictly to:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
            <li>Display accurate regional product currency pricing — such as Indian Rupee <code className="font-bold text-indigo-600 dark:text-indigo-400">₹</code>.</li>
            <li>Serve geographically relevant contextual advertisements and verified merchant store deals.</li>
            <li>Prevent fraud, enforce regional frequency capping, and identify unauthorized automated bot networks.</li>
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            Note: gadgetsprohub does not request, track, or store high-precision GPS satellite coordinates. Location estimation is strictly coarse and derived from standard IP network routing.
          </p>
        </section>

        {/* Section 5: Other Information Stored On or Collected From End Users' Devices */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>5. Other Information Stored On or Collected From Devices</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            In addition to standard HTTP cookies, the platform and advertising partners may utilize other modern browser storage technologies:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">HTML5 LocalStorage:</span> Used by gadgetsprohub to store client-side preferences that persist across sessions, including your saved gadget wishlist, active product comparison queue, color mode in dark or light, and cookie consent records like cookie_consent and cookie_preferences.
            </li>
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">HTML5 SessionStorage:</span> Used to remember transient search filters, active comparison tabs, and sorting selections during an individual browsing session.
            </li>
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Web Beacons, Clear GIFs &amp; Pixels:</span> Small invisible graphic images embedded in web pages or ad placements to record aggregated impression counts, measure ad visibility, and verify that advertising creative renders correctly.
            </li>
          </ul>
        </section>

        {/* Section 6: End Users' Options for Cookie Management & Direct Opt-Outs */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <Sliders className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>6. End Users&apos; Options for Cookie Management &amp; Direct Opt-Outs</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            You retain absolute authority over how cookies and data are used on your device. You can exercise your choices through multiple direct channels:
          </p>

          <div className="space-y-4">
            {/* Direct Tool 1: On-Site Consent Center */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>On-Site Consent Preference Center</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Toggle Analytics and AdSense Marketing cookies on or off directly on this website.
                </p>
              </div>
              <button
                type="button"
                onClick={openCookiePreferences}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs shrink-0 active:scale-95"
              >
                Change Preferences
              </button>
            </div>

            {/* Direct Tool 2: Google Ad Settings & Opt-Out */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Google Personalized Advertising Opt-Out</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Users may opt out of personalized advertising by visiting Google&apos;s ad preference dashboards:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold hover:border-indigo-500 transition-colors inline-flex items-center gap-1 shadow-2xs"
                >
                  Google Ads Settings <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://myadcenter.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold hover:border-indigo-500 transition-colors inline-flex items-center gap-1 shadow-2xs"
                >
                  Google My Ad Center <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Direct Tool 3: Third-Party Industry Opt-Out Initiatives */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Third-Party Vendor Industry Opt-Out Portals</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Alternatively, you can opt out of third-party vendors&apos; use of cookies for personalized advertising through independent advertising alliance portals:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold hover:border-indigo-500 transition-colors inline-flex items-center gap-1 shadow-2xs"
                >
                  aboutads.info • DAA US <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://optout.networkadvertising.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold hover:border-indigo-500 transition-colors inline-flex items-center gap-1 shadow-2xs"
                >
                  NAI Consumer Opt-Out <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://www.youronlinechoices.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold hover:border-indigo-500 transition-colors inline-flex items-center gap-1 shadow-2xs"
                >
                  Your Online Choices • EDAA Europe <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Direct Tool 4: Browser Controls */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Web Browser Native Cookie Controls:
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                You can configure your browser to reject all cookies, block third-party cookies specifically, or alert you when a cookie is placed. Note that disabling essential cookies may impact your ability to preserve wishlist items or active login credentials:
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                <li><strong className="text-slate-700 dark:text-slate-200">Google Chrome:</strong> Settings &gt; Privacy and security &gt; Third-party cookies &gt; Block third-party cookies.</li>
                <li><strong className="text-slate-700 dark:text-slate-200">Mozilla Firefox:</strong> Settings &gt; Privacy &amp; Security &gt; Enhanced Tracking Protection — Strict or Custom.</li>
                <li><strong className="text-slate-700 dark:text-slate-200">Apple Safari:</strong> Settings &gt; Safari &gt; Advanced &gt; Block All Cookies, or toggle &quot;Prevent Cross-Site Tracking&quot;.</li>
                <li><strong className="text-slate-700 dark:text-slate-200">Microsoft Edge:</strong> Settings &gt; Cookies and site permissions &gt; Manage and delete cookies and site data.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 7: EU User Consent Policy & GDPR / UK GDPR Compliance */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>7. EU User Consent Policy, GDPR &amp; UK GDPR Compliance</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            In accordance with <span className="font-semibold text-slate-800 dark:text-slate-100">Google&apos;s EU User Consent Policy</span> and the European Union General Data Protection Regulation — GDPR and UK GDPR — we apply commercially reasonable efforts to obtain and record affirmative consent from users located in the European Economic Area (EEA) and the United Kingdom prior to:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
            <li>Setting, accessing, or storing non-essential cookies and local data on their devices.</li>
            <li>Collecting, sharing, and using personal data for the personalization of advertisements served through Google AdSense.</li>
          </ul>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            If an end user declines marketing cookies, gadgetsprohub automatically instructs the advertising layer to suppress personalized ad tracking, displaying either non-personalized contextual notices or safe internal curated product showcases.
          </p>
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Legal Bases for Processing — GDPR Article 6:
            </h4>
            <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
              <li><strong className="text-slate-700 dark:text-slate-200">Consent — Article 6.1.a:</strong> For non-essential analytics and targeted Google AdSense advertising.</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Legitimate Interest — Article 6.1.f:</strong> For monitoring website uptime, preventing DDoS attacks, and detecting invalid traffic or click fraud to protect publisher and advertiser integrity.</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Performance of a Contract — Article 6.1.b:</strong> For fulfilling user-requested profile synchronization and wishlist management.</li>
            </ul>
          </div>
        </section>

        {/* Section 8: California Consumer Privacy Act (CCPA / CPRA) & US State Laws */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>8. California Consumer Privacy Act — CCPA &amp; CPRA — and US State Privacy Rights</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            For residents of California, Virginia, Colorado, Connecticut, Utah, and other US jurisdictions with consumer privacy statutes, this section serves as our <span className="font-semibold text-slate-800 dark:text-slate-100">Notice at Collection</span>:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Categories of Information Collected:</span> Identifiers including IP address, client device ID, optional Google sign-in email or name, Internet network activity such as specs searched and telemetry, and coarse geolocation.
            </li>
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Notice of &quot;Sale&quot; or &quot;Sharing&quot;:</span> gadgetsprohub does not sell your personal information for monetary compensation. However, under the CCPA and CPRA, permitting third-party advertising partners like Google to collect identifiers and browsing telemetry via cookies for cross-context behavioral advertising may be considered sharing or sale.
            </li>
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Right to Opt-Out:</span> You have the right to direct us not to sell or share your personal information. You can exercise this right at any time by clicking the &quot;Do Not Sell or Share My Info&quot; button in our header, footer, or on-site cookie manager.
            </li>
          </ul>
        </section>

        {/* Section 9: AdSense Invalid Activity & Click Integrity */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <AlertCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>9. AdSense Invalid Activity, Traffic Integrity &amp; Fraud Prevention</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Under <span className="font-semibold text-slate-800 dark:text-slate-100">Section 5 of the Google AdSense Online Terms of Service</span>, publishers and users are strictly prohibited from generating invalid clicks, impressions, queries, or conversions through automated bots, scrapers, click-exchange programs, or fraudulent software.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            To ensure compliance with Google&apos;s Webmaster Quality Guidelines and Ad Implementation Policies:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
            <li>All advertising banners are clearly labeled &quot;Sponsored Showcase&quot; or &quot;AD&quot; and visually separated from editorial tech reviews.</li>
            <li>We do not encourage users or incentivize clicks on advertisements under any circumstances.</li>
            <li>Automated rate-limiting and telemetry monitoring are deployed to detect and nullify bot traffic and suspicious click patterns.</li>
          </ul>
        </section>

        {/* Section 10: Affiliate Marketing & Amazon Associates Disclosure */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <Megaphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>10. Affiliate Marketing &amp; Amazon Associates Disclosure</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            In compliance with FTC guidelines and the Amazon Associates Program Operating Agreement:
          </p>
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs sm:text-sm text-amber-950 dark:text-amber-200 space-y-2">
            <p className="font-bold">&quot;As an Amazon Associate I earn from qualifying purchases.&quot;</p>
            <p className="leading-relaxed">
              When you click on outbound product links to merchants, such as Amazon or verified electronic stores, and make a purchase, gadgetsprohub may receive an affiliate referral commission. This commission comes at <span className="font-semibold underline">no extra cost to you</span> and helps finance our real-time price monitoring infrastructure, hardware benchmarks, and technical audits.
            </p>
          </div>
        </section>

        {/* Section 11: Children's Privacy (COPPA & AdSense Age Policy) */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>11. Children&apos;s Privacy — COPPA and Age Verification Standards</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            In accordance with <span className="font-semibold text-slate-800 dark:text-slate-100">Section 2 of the Google AdSense Terms of Service</span>, our services and properties are intended for individuals who are at least 18 years of age, or the legal age of majority in your jurisdiction.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We do not knowingly collect personal data from children under the age of 16. If we become aware that personal information of a child has been collected without verifiable parental consent, we will take immediate steps to delete that data from our records.
          </p>
        </section>

        {/* Section 12: Data Security, Retention & Your Rights */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>12. Data Security, Retention Periods &amp; User Rights</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We employ modern cryptographic and organizational standards to safeguard your data, including HTTPS and TLS 1.3 encryption in transit, strict Content Security Policies, and role-based access restrictions.
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
            <li><span className="font-semibold text-slate-800 dark:text-slate-100">Analytics Telemetry:</span> Retained in aggregated, pseudonymous format for up to 12 months for performance modeling.</li>
            <li><span className="font-semibold text-slate-800 dark:text-slate-100">User Account &amp; Wishlist Data:</span> Retained as long as your account remains active. You can request deletion of your account and associated wishlist at any time.</li>
            <li><span className="font-semibold text-slate-800 dark:text-slate-100">Data Rights:</span> You have the right to request access to, rectification of, or erasure of your personal information, or to object to processing.</li>
          </ul>
        </section>

        {/* Section 13: Contact Desk & Inquiries */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>13. Contact Desk &amp; Policy Modifications</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We reserve the right to update this Privacy Policy to reflect changes in our legal obligations, technology, or Google AdSense policies. Any material modifications will be posted directly to this page with an updated revision date.
          </p>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <p><strong className="text-slate-900 dark:text-white">Operator:</strong> gadgetsprohub Digital Media</p>
            <p><strong className="text-slate-900 dark:text-white">Privacy Inquiries &amp; Data Requests:</strong> <a href="mailto:deepan20060609@gmail.com" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">deepan20060609@gmail.com</a></p>
            <p><strong className="text-slate-900 dark:text-white">Response Timeframe:</strong> We respond to all formal data protection and CCPA/GDPR requests within 30 calendar days.</p>
          </div>
        </section>

        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            gadgetsprohub — Dedicated to transparent technology journalism, ethical advertising, and uncompromising user data protection.
          </p>
        </div>
      </div>
    </div>
  );
};

