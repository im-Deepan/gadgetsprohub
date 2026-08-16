import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { Blog } from '../types';
import { Eye, Share2, Sparkle, Tag } from 'lucide-react';
import { Helmet } from '../components/Helmet';

import { Breadcrumb } from '../components/Breadcrumb';

interface BlogDetailProps {
  blogSlug: string;
  onNavigate: (view: string, slug?: string) => void;
}

export const BlogDetail: React.FC<BlogDetailProps> = ({ blogSlug, onNavigate }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { data: blog = null, isLoading: queryLoading, isFetching: queryFetching } = useQuery<Blog | null>({
    queryKey: ['blog', blogSlug],
    queryFn: async ({ signal }) => {
      if (!blogSlug) return null;
      const res = await apiFetch(`/api/blogs/${blogSlug}`, { signal });
      if (!res.ok) throw new Error('Blog not found');
      return res.json();
    },
    enabled: Boolean(blogSlug),
    placeholderData: (previousData) => previousData
  });

  const loading = queryLoading || queryFetching;

  React.useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const progress = (scrollTop / totalHeight) * 100;
        setScrollProgress(Math.min(Math.max(progress, 0), 100));
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    
    // Initial calculation
    handleScroll();

    const t1 = setTimeout(handleScroll, 50);
    const t2 = setTimeout(handleScroll, 200);
    const t3 = setTimeout(handleScroll, 600);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loading, blog]);

  const timerRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleShareClick = () => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setCopiedLink(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => setCopiedLink(false), 2000);
        })
        .catch((err) => {
          console.warn('Failed to copy blog URL using clipboard API:', err);
        });
    } else {
      console.warn('Clipboard API is not available in this environment');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-12 pb-8 sm:px-6 animate-pulse text-slate-700 dark:text-slate-50">
        {/* Scroll Progress Bar */}
        <div className="fixed top-0 left-0 w-full h-1 z-[9999] pointer-events-none bg-transparent">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-75 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
        {/* Breadcrumb Skeleton */}
        <div className="flex mb-8">
          <div className="h-9 w-40 bg-slate-100 dark:bg-slate-700 rounded-full"></div>
        </div>

        {/* Big Banner Skeleton */}
        <div className="h-64 sm:h-96 rounded-3xl bg-slate-100 dark:bg-slate-700 shrink-0 mb-8"></div>

        {/* Meta details Skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-5 w-24 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
          <div className="h-5 w-32 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
        </div>

        {/* Main Title lines Skeleton */}
        <div className="space-y-3.5 mb-8">
          <div className="h-9 w-5/6 bg-slate-100 dark:bg-slate-700 rounded"></div>
          <div className="h-9 w-2/3 bg-slate-100 dark:bg-slate-700 rounded"></div>
        </div>

        {/* Content paragraphs Skeletons */}
        <div className="space-y-6 pt-8 border-t border-slate-50 dark:border-slate-700">
          <div className="space-y-2.5">
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-700 rounded"></div>
          </div>

          <div className="space-y-2.5">
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-11/12 bg-slate-100 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="mx-auto max-w-xl text-center py-20 px-4">
        <span className="text-4xl">📚</span>
        <h2 className="text-sm font-bold text-slate-700 mt-4">Manual Not Sourced</h2>
        <p className="text-xs text-slate-300 mt-1">We are unable to extract the specified curation guides. Try choosing other topics.</p>
        <button
          onClick={() => onNavigate('blogs')}
          className="mt-6 rounded-full bg-slate-950 text-white px-5 py-2.5 text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
        >
          Check manuals board
        </button>
      </div>
    );
  }

  return (
    <article className="w-full mx-auto max-w-4xl px-4 pt-12 pb-8 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[9999] pointer-events-none bg-transparent">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-75 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <Helmet>
        <title>{blog ? `${blog.title} - Tech Insights` : 'Blog Details'} | gadgetsprohub</title>
        <meta name="description" content={blog?.excerpt || "Read our latest technology insights at gadgetsprohub."} />
        <meta name="keywords" content={blog ? `${blog.title}, technology news, tech insight, ${blog.category || ''} post, gadgetsprohub` : "technology insights, consumer tech news"} />
        <link rel="canonical" href={`https://gadgetsprohub.com/blogs/${blog?.slug || ''}`} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://gadgetsprohub.com/blogs/${blog?.slug || ''}`} />
        <meta property="og:title" content={blog ? `${blog.title} - Tech Insights | gadgetsprohub` : 'Blog Details'} />
        <meta property="og:description" content={blog?.excerpt || "Read our latest technology insights at gadgetsprohub."} />
        {blog?.imageUrl && <meta property="og:image" content={blog.imageUrl} />}
        <meta property="og:site_name" content="gadgetsprohub" />
        {blog?.date && <meta property="article:published_time" content={new Date(blog.date).toISOString().split('T')[0]} />}
        {blog?.category && <meta property="article:section" content={blog.category} />}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blog ? `${blog.title} - Tech Insights` : 'Blog Details'} />
        <meta name="twitter:description" content={blog?.excerpt || "Read our latest technology insights at gadgetsprohub."} />
        {blog?.imageUrl && <meta name="twitter:image" content={blog.imageUrl} />}
        {blog?.category && <meta name="twitter:label1" content="Category" />}
        {blog?.category && <meta name="twitter:data1" content={blog.category} />}

        <meta name="robots" content="index, follow" />
      </Helmet>
      
      {/* Back button and share */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-8 w-full">
        <Breadcrumb items={[
          { label: 'Home', onClick: () => onNavigate('home') },
          { label: 'Blogs', onClick: () => onNavigate('blogs') },
          { label: blog ? blog.title : 'Loading...', isCurrentPage: true }
        ]} />

        <button
          onClick={handleShareClick}
          className="flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3.5 py-2 text-[10px] font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
          aria-label="Share this guide"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          {copiedLink ? '✓ Copied Link!' : 'Share Guide'}
        </button>
      </div>

      {/* Hero Banner Area */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 font-mono bg-indigo-50 px-2.5 py-1 rounded-sm dark:bg-indigo-950/40 dark:text-indigo-300">
            {blog.category || 'Tech'}
          </span>
          <span className="text-[10px] font-semibold text-slate-300 font-mono">
            {blog.createdAt && new Date(blog.createdAt) instanceof Date && !isNaN(new Date(blog.createdAt).getTime()) ? new Date(blog.createdAt).toLocaleDateString() : 'Active Review'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-sans tracking-tight text-slate-800 leading-snug dark:text-white">
          {blog.title}
        </h1>

        {/* Metadata info */}
        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-300 pt-1.5 border-b pb-4 border-slate-50 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] uppercase font-bold">
              {blog.author?.[0] || 'A'}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-100">{blog.author || 'Admin Curator'}</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>{blog.views || 0} unique reads</span>
          </div>
        </div>
      </div>

      {/* Featured Graphic banner */}
      <div className="w-full h-[200px] sm:h-[360px] aspect-[2/1] rounded-3xl overflow-hidden mb-10 shrink-0 select-none border border-slate-50 dark:border-slate-700">
        <img width="1200" height="600"
          src={blog.featured_image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200'}
          alt={blog.title}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200'; }}
        />
      </div>

      {/* Detailed Editorial Content Layout */}
      <div className="prose max-w-none text-slate-700 dark:text-slate-200 text-xs sm:text-sm leading-relaxed space-y-6">
        <p className="text-sm font-bold border-l-2 border-indigo-500 pl-4 py-1 text-slate-500 dark:text-slate-100 bg-slate-50/50 p-3 rounded-r-xl dark:bg-slate-800/10 italic">
          "{blog.excerpt || 'Find our editorial parameters for complete comparison specs matrices.'}"
        </p>

        {/* Dynamic formatting for paragraphs split by spaces to make it beautiful */}
        {(typeof blog.content === 'string' ? blog.content : '').split('\n\n').filter(Boolean).map((paragraph, index) => (
          <p key={`p-${index}-${paragraph.substring(0, 15)}`} className="leading-relaxed whitespace-pre-line text-slate-500 dark:text-slate-200">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Associated Meta tags */}
      {Array.isArray(blog.tags) && blog.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-10 border-t border-slate-50 dark:border-slate-700 mt-12">
          <Tag className="h-4 w-4 text-slate-300 flex shrink-0" />
          {blog.tags.map(t => (
            <span key={t} className="rounded-lg bg-slate-50 hover:bg-slate-50 dark:bg-slate-800 border border-slate-50 px-2.5 py-1 text-[10px] text-slate-400 font-mono font-semibold uppercase dark:border-slate-700 dark:text-slate-300">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Bottom return banner */}
      <div className="rounded-2xl bg-indigo-50/30 p-6 text-center border border-indigo-50/30 mt-16 dark:bg-slate-800/30 dark:border-slate-700 space-y-4">
        <Sparkle className="h-6 w-6 text-indigo-400 mx-auto animate-pulse" />
        <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">Ready to check the catalog specifications?</h3>
        <p className="text-[11px] text-slate-400 max-w-sm mx-auto dark:text-slate-300">
          Our buying manuals coordinate directly with the dynamic review index. Compare headphone EQ responses or sneakers sole durability directly.
        </p>
        <button
          onClick={() => onNavigate('products')}
          className="rounded-full bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 shadow-md active:scale-95 hover:bg-indigo-600 cursor-pointer"
        >
          Check showcase catalog
        </button>
      </div>

    </article>
  );
};
