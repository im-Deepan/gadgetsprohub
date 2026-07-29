import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { Blog } from '../types';
import { Search, Compass, BookOpen, ChevronRight } from 'lucide-react';
import { AdSenseBanner } from '../components/AdSenseBanner';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from '../components/Helmet';
import { Breadcrumb } from '../components/Breadcrumb';
import { SearchAutocompleteInput } from '../components/SearchAutocompleteInput';

interface BlogProps {
  onNavigate: (view: string, slug?: string) => void;
  onPreload?: (view: any, slug?: string) => void;
}

const BlogCardSkeleton = () => (
  <div className="group flex flex-col rounded-2xl border border-slate-50 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden animate-pulse">
    <div className="h-48 bg-slate-100 dark:bg-slate-700 shrink-0"></div>
    <div className="p-5 flex flex-col flex-grow space-y-3">
      <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-700 rounded"></div>
      <div className="h-5 w-full bg-slate-100 dark:bg-slate-700 rounded"></div>
      <div className="h-10 w-full bg-slate-100 dark:bg-slate-700 rounded"></div>
    </div>
  </div>
);

export const BlogList: React.FC<BlogProps> = ({ onNavigate, onPreload }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: blogsData, isLoading: queryLoading, isFetching: queryFetching } = useQuery({
    queryKey: ['blogs', debouncedSearch, selectedSub],
    queryFn: async ({ signal }) => {
      const q = new URLSearchParams();
      if (debouncedSearch) q.append('search', debouncedSearch);
      if (selectedSub) q.append('category', selectedSub);
      
      const res = await apiFetch(`/api/blogs?${q.toString()}`, { signal });
      if (!res.ok) throw new Error('Failed to fetch blogs');
      const data = await res.json();
      return data?.blogs || [];
    },
    placeholderData: (previousData) => previousData
  });

  const blogs = blogsData || [];
  const loading = queryLoading || queryFetching;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-300">
      <Helmet>
        <title>Tech Insights & News | gadgetsprohub</title>
        <meta name="description" content="Read the latest tech news, gadget reviews, buyer guides, and deep-dive comparisons at the gadgetsprohub blog." />
        <meta name="keywords" content="technology blog, tech news, buying guides, compare phones, laptop reviews, latest devices" />
        <link rel="canonical" href="https://gadgetsprohub.com/blogs" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gadgetsprohub.com/blogs" />
        <meta property="og:title" content="Tech Insights, Buyer Guides & News | gadgetsprohub" />
        <meta property="og:description" content="Stay updated with ultimate buying guides, detailed comparisons, and current consumer technology insights on the gadgetsprohub blog." />
        <meta property="og:image" content="/favicon.png" />
        <meta property="og:site_name" content="gadgetsprohub" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://gadgetsprohub.com/blogs" />
        <meta name="twitter:title" content="Tech Insights & News | gadgetsprohub" />
        <meta name="twitter:description" content="Stay updated with ultimate buying guides, detailed comparisons, and tech news on the gadgetsprohub blog." />
        <meta name="twitter:image" content="/favicon.png" />

        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* BREADCRUMB */}
      <Breadcrumb 
        className="mb-8 max-w-2xl mx-auto"
        items={[
        { label: 'Home', onClick: () => onNavigate('home') },
        { label: 'Buying Manuals', onClick: () => onNavigate('blogs'), isCurrentPage: !search && !selectedSub },
        ...(selectedSub ? [{ label: selectedSub, isCurrentPage: !search }] : []),
        ...(search ? [{ label: `Search: ${search}`, isCurrentPage: true }] : [])
      ]} />
      
      {/* Editorial Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-slate-600 dark:bg-indigo-950/40 dark:text-slate-200">
          <BookOpen className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
          <span>The</span>
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-amber-400 bg-clip-text text-transparent font-black tracking-wide">gadgetsprohub</span>
          <span>Gazette</span>
        </span>
        <h1 className="text-2xl sm:text-3.5xl font-black font-sans tracking-tight text-slate-800 leading-normal dark:text-white">Shopping Guides & Helpful Tips</h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed dark:text-slate-300">
          Unbiased shopping advice, product comparison spreadsheets, and diagnostic checklists to assist you with electronics and apparel decisions.
        </p>

        {/* Big Search Input */}
        <div className="max-w-md mx-auto pt-2">
          <SearchAutocompleteInput
            value={search}
            onChange={(val) => setSearch(val)}
            onNavigate={onNavigate}
            variant="blog"
            placeholder="Search guides, reviews, products..."
            inputClassName="w-full text-xs rounded-full border border-slate-200/80 bg-white py-3 pl-10 pr-10 text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            onClear={() => setSearch('')}
          />
        </div>
      </div>

      {/* Categories Toolbar */}
      <div className="flex flex-wrap justify-center gap-2 mb-10 md:px-4">
        {['', 'Electronics', 'Sports'].map((sub) => (
          <button
            key={sub}
            onClick={() => setSelectedSub(sub)}
            className={`rounded-full px-5 py-1.5 text-xs font-semibold shadow-sm cursor-pointer transition-all ${selectedSub === sub ? 'bg-indigo-500 text-white shadow-indigo-500/10' : 'bg-white border border-slate-50 hover:bg-slate-50 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'}`}
          >
            {sub || '📁 All Manuals'}
          </button>
        ))}
      </div>

      {/* Dynamic buying guide ad-block placement */}
      <div className="mb-8 md:px-4">
        <AdSenseBanner slot="1223904982" />
      </div>

      {/* Cards Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:px-4">
          {[...Array(6)].map((_, i) => (
            <BlogCardSkeleton key={`blog-skeleton-${i}`} />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="border border-dashed border-slate-100 p-12 text-center rounded-2xl dark:border-slate-700">
          <Compass className="h-6 w-6 text-slate-200 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 mt-2 dark:text-white">No Matching Manuals Found</h3>
          <p className="text-xs text-slate-300">Try checking other keywords or clicking clear.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:px-4">
          <AnimatePresence mode="popLayout">
            {blogs.map((b: Blog) => (
              <motion.div
                key={b._id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', damping: 22, stiffness: 160 }}
                className="group flex flex-col rounded-2xl border border-slate-50 bg-white hover:shadow-xl hover:border-slate-100/50 shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden cursor-pointer"
                onClick={() => onNavigate('blog-detail', b.slug)}
                onMouseEnter={() => {
                  if (b.slug) onPreload?.('blog-detail', b.slug);
                }}
              >
                <div className="h-48 bg-slate-50 overflow-hidden relative shrink-0">
                  <img
                    src={b.featured_image || 'https://images.unsplash.com/photo-1005740420928-5e560c06d30e?w=500'}
                    alt={b.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-slate-800/80 rounded-lg px-2.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider font-mono">
                    {b.category || 'Tech'}
                  </span>
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold uppercase tracking-wider font-mono">
                    <span>Author: {b.author || 'Admin'}</span>
                    <span>•</span>
                    <span>Views: {b.views || 0}</span>
                  </div>

                  <h3
                    className="text-xs sm:text-sm font-bold text-slate-800 mt-2.5 leading-snug line-clamp-2 group-hover:text-indigo-500 dark:text-white"
                  >
                    {b.title}
                  </h3>
                  
                  <p className="text-[11px] text-slate-400 line-clamp-3 mt-2 leading-relaxed dark:text-slate-300">
                    {b.excerpt || b.content}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-300 font-bold">{b.createdAt && !isNaN(new Date(b.createdAt).getTime()) ? new Date(b.createdAt).toLocaleDateString() : 'Curated Deal'}</span>
                    <button
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-300 cursor-pointer"
                    >
                      Read insight
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
};
