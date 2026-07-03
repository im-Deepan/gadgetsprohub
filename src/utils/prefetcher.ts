import { queryClient } from './queryClient';
import { apiFetch } from './apiClient';

// Thread-safe registry to track already prefetched endpoints to avoid duplicating prefetch requests
const prefetchedRegistry = new Set<string>();

/**
 * High-performance Prefetcher Utility
 * 
 * Prefetches and warms the cache (both standard memory cache and TanStack query cache)
 * for page views, specific product items, and editorial blogs.
 */
export const prefetchData = async (view: string, slug?: string): Promise<void> => {
  try {
    const registryKey = `${view}:${slug || ''}`;
    if (prefetchedRegistry.has(registryKey)) {
      return; // Already prefetched recently
    }
    prefetchedRegistry.add(registryKey);

    // Keep registry clean: clear keys older than 1 minute to allow fresh prefetching if state changes later
    setTimeout(() => {
      prefetchedRegistry.delete(registryKey);
    }, 60000);

    if (view === 'home') {
      // Warm up API cache
      const apis = ['/api/trending', '/api/categories', '/api/products?limit=100'];
      apis.forEach(api => {
        apiFetch(api).catch(() => {});
      });

      // Warm up TanStack Query cache
      queryClient.prefetchQuery({
        queryKey: ['trending'],
        queryFn: async () => {
          const res = await apiFetch('/api/trending');
          if (!res.ok) throw new Error('Failed to load trending products');
          return res.json();
        }
      }).catch(() => {});

      queryClient.prefetchQuery({
        queryKey: ['categories'],
        queryFn: async () => {
          const res = await apiFetch('/api/categories');
          if (!res.ok) throw new Error('Failed to load categories');
          return res.json();
        }
      }).catch(() => {});

      queryClient.prefetchQuery({
        queryKey: ['homeProducts'],
        queryFn: async () => {
          const res = await apiFetch('/api/products?limit=100');
          if (!res.ok) throw new Error('Failed to load products');
          return res.json();
        }
      }).catch(() => {});
    } 
    
    else if (view === 'products') {
      const cat = slug && slug.startsWith('category-') ? slug.replace('category-', '') : '';
      
      // Warm up API cache
      const params = new URLSearchParams();
      if (cat) params.append('category', cat);
      params.append('page', '1');
      params.append('limit', '200');
      params.append('sort', 'newest');
      apiFetch(`/api/products?${params.toString()}`).catch(() => {});
      apiFetch('/api/categories').catch(() => {});

      // Warm up TanStack Query cache
      queryClient.prefetchQuery({
        queryKey: ['categories'],
        queryFn: async () => {
          const res = await apiFetch('/api/categories');
          if (!res.ok) throw new Error('Failed to load categories');
          return res.json();
        }
      }).catch(() => {});

      queryClient.prefetchQuery({
        queryKey: ['products', '', cat, '', '', '', '', 'newest', 1],
        queryFn: async () => {
          const p = new URLSearchParams();
          if (cat) p.append('category', cat);
          p.append('page', '1');
          p.append('limit', '200');
          p.append('sort', 'newest');
          const res = await apiFetch(`/api/products?${p.toString()}`);
          if (!res.ok) throw new Error('Failed to load products');
          return res.json();
        }
      }).catch(() => {});
    } 
    
    else if (view === 'blogs') {
      // Warm up API cache
      apiFetch('/api/blogs').catch(() => {});

      // Warm up TanStack Query cache
      queryClient.prefetchQuery({
        queryKey: ['blogs', '', ''],
        queryFn: async () => {
          const res = await apiFetch('/api/blogs');
          if (!res.ok) throw new Error('Failed to fetch blogs');
          const data = await res.json();
          return data?.blogs || [];
        }
      }).catch(() => {});
    } 
    
    else if (view === 'blog-detail' && slug) {
      // Warm up API cache
      apiFetch(`/api/blogs/${slug}`).catch(() => {});

      // Warm up TanStack Query cache
      queryClient.prefetchQuery({
        queryKey: ['blog', slug],
        queryFn: async () => {
          const res = await apiFetch(`/api/blogs/${slug}`);
          if (!res.ok) throw new Error('Blog not found');
          return res.json();
        }
      }).catch(() => {});
    } 
    
    else if (view === 'product-detail' && slug) {
      // Product detail pages load using standard apiFetch. Warming this API caches it inside apiClient!
      apiFetch(`/api/products/${slug}`).catch(() => {});
      apiFetch(`/api/products/click/${slug}`, { method: 'POST' }).catch(() => {}); // Optional click analytics warm-up
    }
  } catch (err) {
    console.warn('[Prefetcher] Error prefetching data:', err);
  }
};
