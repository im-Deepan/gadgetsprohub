import React, { useState, useEffect } from 'react';
import { Blog } from '../types';
import { ArrowLeft, Clock, Eye, Share2, CornerDownLeft, Sparkle, Tag } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface BlogDetailProps {
  blogSlug: string;
  onNavigate: (view: string, slug?: string) => void;
}

export const BlogDetail: React.FC<BlogDetailProps> = ({ blogSlug, onNavigate }) => {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchBlogDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/blogs/${blogSlug}`);
        if (res.ok) {
          const data = await res.json();
          setBlog(data);
        }
      } catch (e) {
        console.warn("Failing of specifications editorial sourcing details:", e);
      } finally {
        setLoading(false);
      }
    };
    if (blogSlug) {
      fetchBlogDetail();
    }
  }, [blogSlug]);

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-12 pb-8 sm:px-6 animate-pulse text-slate-805 dark:text-slate-100">
        {/* Breadcrumb Skeleton */}
        <div className="flex mb-8">
          <div className="h-9 w-40 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        </div>

        {/* Big Banner Skeleton */}
        <div className="h-64 sm:h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 shrink-0 mb-8"></div>

        {/* Meta details Skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>

        {/* Main Title lines Skeleton */}
        <div className="space-y-3.5 mb-8">
          <div className="h-9 w-5/6 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-9 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>

        {/* Content paragraphs Skeletons */}
        <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-2.5">
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>

          <div className="space-y-2.5">
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-11/12 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="mx-auto max-w-xl text-center py-20 px-4">
        <span className="text-4xl">📚</span>
        <h2 className="text-sm font-bold text-slate-800 mt-4">Manual Not Sourced</h2>
        <p className="text-xs text-slate-400 mt-1">We are unable to extract the specified curation guides. Try choosing other topics.</p>
        <button
          onClick={() => onNavigate('blogs')}
          className="mt-6 rounded-full bg-slate-950 text-white px-5 py-2.5 text-xs font-semibold hover:bg-indigo-600 cursor-pointer"
        >
          Check manuals board
        </button>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-4xl px-4 pt-12 pb-8 sm:px-6 lg:px-8 transition-colors duration-300">
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
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => onNavigate('blogs')}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer transition-all hover:border-slate-350"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500 shrink-0" />
          <span>Back to Buying Manuals</span>
        </button>

        <button
          onClick={handleShareClick}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5" />
          {copiedLink ? '✓ Copied Link!' : 'Share Guide'}
        </button>
      </div>

      {/* Hero Banner Area */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 font-mono bg-indigo-50 px-2.5 py-1 rounded-sm dark:bg-indigo-950/40 dark:text-indigo-400">
            {blog.category || 'Tech'}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 font-mono">
            {blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'Active Review'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-sans tracking-tight text-slate-900 leading-snug dark:text-white">
          {blog.title}
        </h1>

        {/* Metadata info */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-b pb-4 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] uppercase font-bold">
              {blog.author?.[0] || 'A'}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{blog.author || 'Admin Curator'}</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{blog.views || 0} unique reads</span>
          </div>
        </div>
      </div>

      {/* Featured Graphic banner */}
      <div className="h-[360px] rounded-3xl overflow-hidden mb-10 shrink-0 select-none border border-slate-100 dark:border-slate-800">
        <img
          src={blog.featured_image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200'}
          alt={blog.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Detailed Editorial Content Layout */}
      <div className="prose max-w-none text-slate-800 dark:text-slate-300 text-xs sm:text-sm leading-relaxed space-y-6">
        <p className="text-sm font-bold border-l-2 border-indigo-600 pl-4 py-1 text-slate-600 dark:text-slate-200 bg-slate-50/50 p-3 rounded-r-xl dark:bg-slate-900/10 italic">
          "{blog.excerpt || 'Find our editorial parameters for complete comparison specs matrices.'}"
        </p>

        {/* Dynamic formatting for paragraphs split by spaces to make it beautiful */}
        {blog.content?.split('\n\n').map((paragraph, index) => (
          <p key={index} className="leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Associated Meta tags */}
      {blog.tags && blog.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-10 border-t border-slate-100 dark:border-slate-800 mt-12">
          <Tag className="h-4 w-4 text-slate-400 flex shrink-0" />
          {blog.tags.map(t => (
            <span key={t} className="rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 border border-slate-100 px-2.5 py-1 text-[10px] text-slate-500 font-mono font-semibold uppercase dark:border-slate-800 dark:text-slate-400">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Bottom return banner */}
      <div className="rounded-2xl bg-indigo-50/30 p-6 text-center border border-indigo-100/30 mt-16 dark:bg-slate-900/30 dark:border-slate-800 space-y-4">
        <Sparkle className="h-6 w-6 text-indigo-500 mx-auto animate-pulse" />
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Ready to check the catalog specifications?</h3>
        <p className="text-[11px] text-slate-500 max-w-sm mx-auto dark:text-slate-400">
          Our buying manuals coordinate directly with the dynamic review index. Compare headphone EQ responses or sneakers sole durability directly.
        </p>
        <button
          onClick={() => onNavigate('products')}
          className="rounded-full bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 shadow-md active:scale-95 hover:bg-indigo-700 cursor-pointer"
        >
          Check showcase catalog
        </button>
      </div>

    </article>
  );
};
