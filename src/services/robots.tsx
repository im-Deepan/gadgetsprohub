import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Bot, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  ExternalLink,
  Sparkles,
  Layers,
  Terminal
} from 'lucide-react';
import { 
  generateRobotsTxt, 
  validateRobotsUrl, 
  ROBOTS_CRAWLER_GROUPS, 
  STANDARD_ALLOWED_PATHS, 
  STANDARD_DISALLOWED_PATHS,
  RobotsOptions,
  RobotsRuleGroup,
  RobotsValidationResult
} from './robotsEngine';

export * from './robotsEngine';

/**
 * Next.js / Universal Metadata Route compatibility interface
 */
export interface RobotsMetadata {
  rules: {
    userAgent: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
    crawlDelay?: number;
  }[];
  sitemap?: string | string[];
  host?: string;
}

/**
 * Metadata exporter for framework standard route handlers
 */
export function robots(): RobotsMetadata {
  return {
    rules: [
      {
        userAgent: ROBOTS_CRAWLER_GROUPS.googleInspection,
        allow: ['/', '/assets/', '/uploads/', '/api/products', '/api/categories', '/api/blogs'],
        disallow: ['/admin/', '/api/admin/', '/api/auth/']
      },
      {
        userAgent: ROBOTS_CRAWLER_GROUPS.majorSearchEngines,
        allow: ['/', '/assets/', '/uploads/'],
        disallow: ['/admin/', '/api/admin/', '/api/auth/']
      },
      {
        userAgent: ROBOTS_CRAWLER_GROUPS.socialMediaBots,
        allow: ['/', '/assets/', '/uploads/', '/og-banner.png', '/favicon.png'],
        disallow: ['/admin/']
      },
      {
        userAgent: ROBOTS_CRAWLER_GROUPS.aiAssistantBots,
        allow: ['/', '/products', '/product-detail/', '/blogs', '/blog-detail/'],
        disallow: ['/admin/', '/api/admin/', '/api/auth/']
      },
      {
        userAgent: ROBOTS_CRAWLER_GROUPS.seoAuditBots,
        allow: ['/'],
        disallow: ['/admin/', '/api/admin/', '/api/auth/'],
        crawlDelay: 2
      },
      {
        userAgent: '*',
        allow: [
          '/',
          '/assets/',
          '/uploads/',
          '/search',
          '/og-banner.png',
          '/favicon.png',
          '/api/products',
          '/api/categories',
          '/api/blogs',
          '/api/deals',
          '/api/visit',
          '/api/health-check'
        ],
        disallow: STANDARD_DISALLOWED_PATHS
      }
    ],
    sitemap: [
      'https://gadgetsprohub.onrender.com/sitemap.xml',
      'https://gadgetsprohub.onrender.com/sitemap-products.xml',
      'https://gadgetsprohub.onrender.com/sitemap-blogs.xml',
      'https://gadgetsprohub.onrender.com/sitemap-categories.xml',
      'https://gadgetsprohub.onrender.com/sitemap-images.xml'
    ],
    host: 'https://gadgetsprohub.onrender.com'
  };
}

export default robots;

/**
 * Interactive React Inspector & Simulator Component for Robots
 */
export const RobotsInspector: React.FC<{ initialHost?: string }> = ({ initialHost = 'gadgetsprohub.onrender.com' }) => {
  const [host, setHost] = useState(initialHost);
  const [enableAi, setEnableAi] = useState(true);
  const [copied, setCopied] = useState(false);
  const [testAgent, setTestAgent] = useState('Google-InspectionTool');
  const [testPath, setTestPath] = useState('/product-detail/iphone-16-pro');

  const generatedTxt = useMemo(() => {
    return generateRobotsTxt({ host, enableAiBots: enableAi });
  }, [host, enableAi]);

  const testResult = useMemo(() => {
    return validateRobotsUrl(testAgent, testPath, generatedTxt);
  }, [testAgent, testPath, generatedTxt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedTxt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedTxt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'robots.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Bot className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Robots.txt Engine & Inspection Simulator
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            RFC 9309-compliant crawler directives optimized for Google Search Console, AI bots, and rich preview crawlers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy Directives'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export robots.txt
          </button>
        </div>
      </div>

      {/* Live Interactive Simulator */}
      <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Real-Time Googlebot & Crawler Simulator
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Select User-Agent
            </label>
            <select
              value={testAgent}
              onChange={(e) => setTestAgent(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <optgroup label="Google Inspection & Core">
                {ROBOTS_CRAWLER_GROUPS.googleInspection.map(bot => (
                  <option key={bot} value={bot}>{bot}</option>
                ))}
              </optgroup>
              <optgroup label="Major Search Engines">
                {ROBOTS_CRAWLER_GROUPS.majorSearchEngines.map(bot => (
                  <option key={bot} value={bot}>{bot}</option>
                ))}
              </optgroup>
              <optgroup label="AI / LLM Bots">
                {ROBOTS_CRAWLER_GROUPS.aiAssistantBots.map(bot => (
                  <option key={bot} value={bot}>{bot}</option>
                ))}
              </optgroup>
              <optgroup label="Social Media Bots">
                {ROBOTS_CRAWLER_GROUPS.socialMediaBots.map(bot => (
                  <option key={bot} value={bot}>{bot}</option>
                ))}
              </optgroup>
              <optgroup label="SEO Crawlers">
                {ROBOTS_CRAWLER_GROUPS.seoAuditBots.map(bot => (
                  <option key={bot} value={bot}>{bot}</option>
                ))}
              </optgroup>
              <option value="*">* (Catch-All)</option>
            </select>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Test URL Path
            </label>
            <div className="relative">
              <input
                type="text"
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                placeholder="/product-detail/iphone-16-pro"
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-8 py-2 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          <div className="sm:col-span-3 flex flex-col justify-end">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Simulation Status
            </label>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${
              testResult.allowed 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}>
              {testResult.allowed ? (
                <>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate">Allowed (200 OK)</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span className="truncate">Blocked (Disallow)</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono flex items-center justify-between">
          <span>{testResult.reason}</span>
          {testResult.matchingRule && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-indigo-600 dark:text-indigo-400">
              {testResult.matchingRule}
            </span>
          )}
        </div>
      </div>

      {/* Code Editor / Visualizer */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Generated Payload View
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={enableAi}
                onChange={(e) => setEnableAi(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              Allow AI Retrieval Crawlers
            </label>
          </div>
        </div>

        <pre className="w-full max-h-[380px] overflow-auto p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed border border-slate-800 selection:bg-indigo-500 selection:text-white">
          {generatedTxt}
        </pre>
      </div>
    </div>
  );
};
