import React from 'react';

interface AdminEditFormState {
  name: string;
  price: string;
  originalPrice: string;
  discount: string;
  affiliateLink: string;
  videoUrl: string;
  description: string;
  longDescription: string;
  features: string;
  pros: string;
  cons: string;
}

interface AdminProductEditPanelProps {
  isAdminEditVisible: boolean;
  setIsAdminEditVisible: (val: boolean) => void;
  adminEditForm: AdminEditFormState;
  setAdminEditForm: (form: AdminEditFormState) => void;
  handleAdminEditSubmit: (e: React.FormEvent) => void;
  isSavingAdminEdit: boolean;
  adminEditSuccess: boolean;
}

export const AdminProductEditPanel: React.FC<AdminProductEditPanelProps> = ({
  isAdminEditVisible,
  setIsAdminEditVisible,
  adminEditForm,
  setAdminEditForm,
  handleAdminEditSubmit,
  isSavingAdminEdit,
  adminEditSuccess,
}) => {
  return (
    <div className="bg-violet-50/50 dark:bg-violet-950/15 border border-violet-100 dark:border-violet-900/40 p-4 rounded-xl -mx-2 sm:-mx-0 space-y-3 mb-6 transition-all font-sans">
      <div className="flex items-center justify-between pointer-events-none">
        <h3 className="text-[10px] font-black uppercase text-violet-800 dark:text-violet-400 tracking-wider flex items-center gap-2">
          Administrator Mode Active
        </h3>
        <button
          type="button"
          onClick={() => setIsAdminEditVisible(!isAdminEditVisible)}
          className="text-xs font-bold text-violet-700 hover:text-violet-950 dark:text-violet-400 dark:hover:text-violet-300 underline cursor-pointer pointer-events-auto"
        >
          {isAdminEditVisible ? 'Hide Editor Panel' : '✏️ Quick Edit Product Specs'}
        </button>
      </div>

      {isAdminEditVisible && (
        <form onSubmit={handleAdminEditSubmit} className="space-y-2.5 pt-1 text-slate-805 dark:text-slate-100">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Product Title</label>
            <input
              type="text"
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              value={adminEditForm.name}
              onChange={e => setAdminEditForm({ ...adminEditForm, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Price (₹)</label>
              <input
                type="number"
                step="0.01"
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                value={adminEditForm.price}
                onChange={e => setAdminEditForm({ ...adminEditForm, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Original Price (₹)</label>
              <input
                type="number"
                step="0.01"
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                value={adminEditForm.originalPrice}
                onChange={e => setAdminEditForm({ ...adminEditForm, originalPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Discount (%)</label>
              <input
                type="number"
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                value={adminEditForm.discount}
                onChange={e => setAdminEditForm({ ...adminEditForm, discount: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Affiliate Destination Link / Shop URL</label>
            <input
              type="text"
              className="w-full text-xs p-2 rounded-lg border border-indigo-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-indigo-650 dark:text-indigo-400"
              value={adminEditForm.affiliateLink}
              onChange={e => setAdminEditForm({ ...adminEditForm, affiliateLink: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Demo Video URL (Direct MP4 clip link)</label>
            <input
              type="text"
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono"
              value={adminEditForm.videoUrl}
              onChange={e => setAdminEditForm({ ...adminEditForm, videoUrl: e.target.value })}
              placeholder="e.g. https://assets.mixkit.co/...-large.mp4"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Short Outline Summary</label>
            <input
              type="text"
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              value={adminEditForm.description}
              onChange={e => setAdminEditForm({ ...adminEditForm, description: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Deep specification details (Text/Markdown)</label>
            <textarea
              rows={3}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-sans"
              value={adminEditForm.longDescription}
              onChange={e => setAdminEditForm({ ...adminEditForm, longDescription: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Highlighted Advantages (Comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Active Noise Cancellation, Smart Battery, Waterproof"
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              value={adminEditForm.features}
              onChange={e => setAdminEditForm({ ...adminEditForm, features: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Verified Pros (Comma separated)</label>
              <textarea
                rows={2}
                placeholder="Comfortable, dynamic sound..."
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                value={adminEditForm.pros}
                onChange={e => setAdminEditForm({ ...adminEditForm, pros: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Verified Cons (Comma separated)</label>
              <textarea
                rows={2}
                placeholder="Expensive, heavy..."
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                value={adminEditForm.cons}
                onChange={e => setAdminEditForm({ ...adminEditForm, cons: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingAdminEdit}
            className="w-full py-2.5 rounded-lg bg-violet-700 hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
          >
            {isSavingAdminEdit ? 'Saving alterations...' : '✓ Put Save to Live Storefront'}
          </button>

          {adminEditSuccess && (
            <div className="bg-emerald-50 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-350 p-2.5 rounded-lg text-center text-[11px] font-bold border border-emerald-200/45">
              ✓ Product details & affiliate referral redirect saved live on website!
            </div>
          )}
        </form>
      )}
    </div>
  );
};
