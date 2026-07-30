import React from 'react';

const ShimmerBase = "bg-[linear-gradient(110deg,#f8fafc,45%,#f1f5f9,55%,#f8fafc)] dark:bg-[linear-gradient(110deg,#1e293b,45%,#334155,55%,#1e293b)] bg-[length:200%_100%] animate-shimmer";

export const ProductCardSkeleton: React.FC = () => (
  <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden relative">
    <div className={`h-48 shrink-0 ${ShimmerBase}`}></div>
    <div className="p-4 flex flex-col flex-grow space-y-3">
      <div className={`h-3 w-1/3 rounded-full ${ShimmerBase}`}></div>
      <div className={`h-5 w-full rounded-md ${ShimmerBase}`}></div>
      <div className={`h-4 w-5/6 rounded-md ${ShimmerBase}`}></div>
      
      <div className="flex gap-2 pt-2">
        <div className={`h-5 w-16 rounded-full ${ShimmerBase}`}></div>
        <div className={`h-5 w-12 rounded-full ${ShimmerBase}`}></div>
      </div>
      
      <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
        <div className={`h-5 w-20 rounded-md ${ShimmerBase}`}></div>
        <div className={`h-8 w-24 rounded-lg ${ShimmerBase}`}></div>
      </div>
    </div>
  </div>
);

export const BlogCardSkeleton: React.FC = () => (
  <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden relative">
    <div className={`h-52 shrink-0 ${ShimmerBase}`}></div>
    <div className="p-5 flex flex-col flex-grow space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-4 w-16 rounded-full ${ShimmerBase}`}></div>
        <div className={`h-4 w-20 rounded-full ${ShimmerBase}`}></div>
      </div>
      <div className={`h-6 w-full rounded-md ${ShimmerBase}`}></div>
      <div className={`h-6 w-3/4 rounded-md ${ShimmerBase}`}></div>
      <div className={`h-4 w-full rounded-md mt-2 ${ShimmerBase}`}></div>
      <div className={`h-4 w-5/6 rounded-md ${ShimmerBase}`}></div>
      
      <div className="mt-auto pt-4 flex items-center gap-3">
        <div className={`h-8 w-8 rounded-full ${ShimmerBase}`}></div>
        <div className={`h-4 w-24 rounded-md ${ShimmerBase}`}></div>
      </div>
    </div>
  </div>
);

export const ProductPageSkeleton: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`h-4 w-12 rounded-md ${ShimmerBase}`}></div>
        <div className={`h-3 w-3 rounded-full ${ShimmerBase}`}></div>
        <div className={`h-4 w-16 rounded-md ${ShimmerBase}`}></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Mock Filter Controls */}
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <div className={`h-12 rounded-2xl ${ShimmerBase}`}></div>
          <div className="hidden lg:block space-y-4">
             <div className={`h-48 rounded-2xl ${ShimmerBase}`}></div>
             <div className={`h-32 rounded-2xl ${ShimmerBase}`}></div>
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-grow space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-800">
            <div className={`h-6 w-48 rounded-md ${ShimmerBase}`}></div>
            <div className={`h-8 w-32 rounded-lg ${ShimmerBase}`}></div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={`prod-skeleton-${i}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BlogPageSkeleton: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center justify-center gap-2 mb-8 max-w-2xl mx-auto">
        <div className={`h-4 w-12 rounded-md ${ShimmerBase}`}></div>
        <div className={`h-3 w-3 rounded-full ${ShimmerBase}`}></div>
        <div className={`h-4 w-16 rounded-md ${ShimmerBase}`}></div>
      </div>

      {/* Title Centered Area */}
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
        <div className={`h-6 w-32 rounded-full mx-auto ${ShimmerBase}`}></div>
        <div className={`h-10 w-64 sm:w-96 rounded-lg mx-auto ${ShimmerBase}`}></div>
        <div className={`h-5 w-full max-w-md rounded-md mx-auto mt-4 ${ShimmerBase}`}></div>
        <div className="flex justify-center gap-3 mt-6">
          <div className={`h-10 w-32 rounded-full ${ShimmerBase}`}></div>
          <div className={`h-10 w-32 rounded-full ${ShimmerBase}`}></div>
        </div>
      </div>

      {/* Grid Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:px-4">
        {[...Array(6)].map((_, i) => (
          <BlogCardSkeleton key={`blog-skeleton-${i}`} />
        ))}
      </div>
    </div>
  );
};
