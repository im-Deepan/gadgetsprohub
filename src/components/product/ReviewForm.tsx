import React from 'react';
import { Star } from 'lucide-react';

interface ReviewFormProps {
  isAuthenticated: boolean;
  reviewSuccess: boolean;
  reviewError: string;
  reviewLoading?: boolean;
  reviewRating: number;
  setReviewRating: (rating: number) => void;
  reviewTitle: string;
  setReviewTitle: (title: string) => void;
  reviewContent: string;
  setReviewContent: (content: string) => void;
  handleReviewSubmit: (e: React.FormEvent) => void;
  onNavigate: (view: string) => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  isAuthenticated,
  reviewSuccess,
  reviewError,
  reviewLoading,
  reviewRating,
  setReviewRating,
  reviewTitle,
  setReviewTitle,
  reviewContent,
  setReviewContent,
  handleReviewSubmit,
  onNavigate
}) => {
  return (
    <div className="rounded-2xl border border-slate-50 p-5 bg-white shadow-xs dark:border-slate-700 dark:bg-zinc-800/40">
      <h4 className="text-xs font-bold uppercase text-slate-700 mb-4 tracking-wider dark:text-white">Submit Verified Review</h4>

      {isAuthenticated ? (
        <form onSubmit={handleReviewSubmit} className="space-y-3.5">
          {reviewSuccess && (
            <div className="rounded-xl bg-teal-50 p-3 text-xs text-teal-700">
              ✓ Feedback submitted on active viewport state successfully.
            </div>
          )}
          {reviewError && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
              {reviewError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Rating Score (1-5 Stars)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(starIdx => (
                <button
                  type="button"
                  key={starIdx}
                  onClick={() => setReviewRating(starIdx)}
                  className="text-amber-300 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                >
                  <Star className={`h-5 w-5 ${starIdx <= reviewRating ? 'fill-amber-300' : 'text-slate-100'}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Review Core Summary</label>
            <input
              type="text"
              required
              placeholder="e.g. Incredible spatial depth!"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-100 bg-white p-2.5 text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Descriptive Comment</label>
            <textarea
              rows={3}
              required
              placeholder="Add specification clarifications or active workout usage opinions..."
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-100 bg-white p-2.5 text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={reviewLoading}
            className={`w-full rounded-xl bg-slate-800 text-white font-bold py-2.5 text-xs tracking-wider transition-colors cursor-pointer active:scale-97 ${reviewLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-indigo-500'}`}
          >
            {reviewLoading ? 'Posting...' : 'Post Feedback'}
          </button>
        </form>
      ) : (
        <div className="text-center p-4">
          <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">Login with your account to leave a star rating and review.</p>
          <button
            onClick={() => onNavigate('login')}
            className="rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 py-1.5 px-4 text-[10px] font-bold cursor-pointer transition-all active:scale-95 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-900/60"
          >
            Go to Login Drawer
          </button>
        </div>
      )}
    </div>
  );
};
