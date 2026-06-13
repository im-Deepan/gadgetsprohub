import React from 'react';
import { Star } from 'lucide-react';

interface ReviewFormProps {
  isAuthenticated: boolean;
  reviewSuccess: boolean;
  reviewError: string;
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
    <div className="rounded-2xl border border-slate-100 p-5 bg-white shadow-xs dark:border-slate-800 dark:bg-zinc-900/40">
      <h4 className="text-xs font-bold uppercase text-slate-800 mb-4 tracking-wider dark:text-white">Submit Verified Review</h4>

      {isAuthenticated ? (
        <form onSubmit={handleReviewSubmit} className="space-y-3.5">
          {reviewSuccess && (
            <div className="rounded-xl bg-teal-50 p-3 text-xs text-teal-800">
              ✓ Feedback submitted on active viewport state successfully.
            </div>
          )}
          {reviewError && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
              {reviewError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rating Score (1-5 Stars)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(starIdx => (
                <button
                  type="button"
                  key={starIdx}
                  onClick={() => setReviewRating(starIdx)}
                  className="text-amber-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                >
                  <Star className={`h-5 w-5 ${starIdx <= reviewRating ? 'fill-amber-400' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Review Core Summary</label>
            <input
              type="text"
              required
              placeholder="e.g. Incredible spatial depth!"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Descriptive Comment</label>
            <textarea
              rows={3}
              placeholder="Add specification clarifications or active workout usage opinions..."
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold py-2.5 text-xs tracking-wider transition-colors cursor-pointer active:scale-97"
          >
            Post Feedback
          </button>
        </form>
      ) : (
        <div className="text-center p-4">
          <p className="text-xs text-slate-400 mb-3.5 leading-relaxed">Login with your account to leave a star rating and review.</p>
          <button
            onClick={() => onNavigate('login')}
            className="rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 py-1.5 px-4 text-[10px] font-bold cursor-pointer transition-all active:scale-95 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300"
          >
            Go to Login Drawer
          </button>
        </div>
      )}
    </div>
  );
};
