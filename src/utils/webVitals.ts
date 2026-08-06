/**
 * Web Vitals & Performance Budget Monitoring Utility
 * Measures core web metrics (LCP, FCP, CLS, TTFB) using standard PerformanceObserver APIs
 * and checks performance budgets for high user experience standards.
 */

export interface Metric {
  name: 'LCP' | 'FCP' | 'CLS' | 'TTFB' | 'FID';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

const BUDGETS = {
  LCP: 2500, // ms
  FCP: 1800, // ms
  CLS: 0.1,  // score
  FID: 100,  // ms
  TTFB: 800  // ms
};

function getRating(name: Metric['name'], value: number): Metric['rating'] {
  const budget = BUDGETS[name];
  if (value <= budget) return 'good';
  if (value <= budget * 1.5) return 'needs-improvement';
  return 'poor';
}

function logMetric(metric: Metric) {
  if (process.env.NODE_ENV !== 'production' || window.location.search.includes('debug_perf=true')) {
    const color = metric.rating === 'good' ? '#10B981' : metric.rating === 'needs-improvement' ? '#F59E0B' : '#EF4444';
    console.info(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}${metric.name === 'CLS' ? '' : 'ms'} (${metric.rating.toUpperCase()})`,
      `color: ${color}; font-weight: bold;`
    );
  }
}

export function initWebVitals(onPerfMetric?: (metric: Metric) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  // 1. First Contentful Paint (FCP)
  try {
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntriesByName('first-contentful-paint');
      if (entries.length > 0) {
        const val = entries[0].startTime;
        const metric: Metric = { name: 'FCP', value: val, rating: getRating('FCP', val) };
        logMetric(metric);
        onPerfMetric?.(metric);
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // Ignore observer unsupported errors
  }

  // 2. Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        const val = lastEntry.startTime;
        const metric: Metric = { name: 'LCP', value: val, rating: getRating('LCP', val) };
        logMetric(metric);
        onPerfMetric?.(metric);
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    // Ignore
  }

  // 3. Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      const metric: Metric = { name: 'CLS', value: clsValue, rating: getRating('CLS', clsValue) };
      logMetric(metric);
      onPerfMetric?.(metric);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Ignore
  }

  // 4. Time to First Byte (TTFB)
  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const val = navEntries[0].responseStart;
      const metric: Metric = { name: 'TTFB', value: val, rating: getRating('TTFB', val) };
      logMetric(metric);
      onPerfMetric?.(metric);
    }
  } catch (e) {
    // Ignore
  }
}
