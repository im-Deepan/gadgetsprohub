import React from 'react';

export const ProductCardSkeleton: React.FC = () => (
  <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden animate-pulse">
    <div className="h-48 bg-slate-200 dark:bg-slate-800 shrink-0"></div>
    <div className="p-4 flex flex-col flex-grow space-y-3">
      <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-5 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  </div>
);

export const BlogCardSkeleton: React.FC = () => (
  <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden animate-pulse">
    <div className="h-48 bg-slate-200 dark:bg-slate-800 shrink-0"></div>
    <div className="p-5 flex flex-col flex-grow space-y-3">
      <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-5 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
    </div>
  </div>
);

export const ProductPageSkeleton: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2 mb-8 animate-pulse">
        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-850 rounded"></div>
        <div className="h-3 w-3 bg-slate-200 dark:bg-slate-850 rounded-full"></div>
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-850 rounded"></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Mock Filter Controls */}
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="h-12 bg-slate-200 dark:bg-slate-850 rounded-2xl animate-pulse"></div>
          <div className="h-48 bg-slate-200 dark:bg-slate-850 rounded-2xl animate-pulse hidden lg:block"></div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-grow space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 animate-pulse">
            <div className="h-6 w-36 bg-slate-200 dark:bg-slate-850 rounded"></div>
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-850 rounded"></div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
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
      <div className="flex items-center justify-center gap-2 mb-8 animate-pulse max-w-2xl mx-auto">
        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-850 rounded"></div>
        <div className="h-3 w-3 bg-slate-200 dark:bg-slate-850 rounded-full"></div>
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-850 rounded"></div>
      </div>

      {/* Title Centered Area */}
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-12 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-850 rounded-full mx-auto"></div>
        <div className="h-8 w-64 sm:w-96 bg-slate-200 dark:bg-slate-850 rounded mx-auto"></div>
        <div className="h-4 w-full max-w-xs bg-slate-200 dark:bg-slate-850 rounded mx-auto"></div>
        <div className="h-10 w-full max-w-md bg-slate-200 dark:bg-slate-850 rounded-full mx-auto mt-4"></div>
      </div>

      {/* Grid Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:px-4">
        {[...Array(6)].map((_, i) => (
          <BlogCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};
