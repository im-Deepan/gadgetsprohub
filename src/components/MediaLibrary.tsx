import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Search, Image as ImageIcon, BarChart2, RefreshCw } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';
import { ConfirmDialog } from './admin/ConfirmDialog';

export function MediaLibrary({ token }: { token: string | null }) {
  const [media, setMedia] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/media', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMedia(data.data);
      }
      
      const statsRes = await apiFetch('/api/admin/media/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchMedia();
  }, [token]);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    await apiFetch(`/api/admin/media/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchMedia();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    await apiFetch('/api/admin/media/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    fetchMedia();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-sm font-medium">Total Images</div>
            <div className="text-2xl font-bold text-slate-800">{stats?.totalImages || 0}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-full text-blue-600"><ImageIcon className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-sm font-medium">Space Saved</div>
            <div className="text-2xl font-bold text-slate-800">
              {stats?.spaceSaved ? (stats.spaceSaved / 1024 / 1024).toFixed(2) : 0} MB
            </div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-full text-emerald-600"><BarChart2 className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-sm font-medium">Duplicates Blocked</div>
            <div className="text-2xl font-bold text-slate-800">{stats?.duplicateImages || 0}</div>
          </div>
          <div className="bg-amber-50 p-3 rounded-full text-amber-600"><RefreshCw className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-sm font-medium">Storage Used</div>
            <div className="text-2xl font-bold text-slate-800">
              {stats?.storageUsed ? (stats.storageUsed / 1024 / 1024).toFixed(2) : 0} MB
            </div>
          </div>
          <div className="bg-violet-50 p-3 rounded-full text-violet-600"><Download className="w-6 h-6" /></div>
        </div>
      
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-sm font-medium">Processing Queue</div>
            <div className="text-2xl font-bold text-slate-800">{stats?.queuedJobs || 0}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-full text-orange-600"><RefreshCw className="w-6 h-6 animate-spin" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-sm font-medium">Failed Jobs</div>
            <div className="text-2xl font-bold text-rose-600">{stats?.failedJobs || 0}</div>
          </div>
          <div className="bg-rose-50 p-3 rounded-full text-rose-600"><Trash2 className="w-6 h-6" /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Media Library</h2>
          <div className="flex gap-2">
            <label className="bg-violet-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-violet-700 transition">
              <Upload className="w-4 h-4" />
              Upload Image
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            </label>
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-5 gap-4">
            {loading ? <p>Loading...</p> : media.map((item) => (
              <div key={item._id} className="border border-slate-200 rounded-lg overflow-hidden group">
                <div className="aspect-square bg-slate-100 relative">
                  <img src={item.variants?.thumb || item.localPath} alt={item.fileName} className="w-full h-full object-cover" loading="lazy" />
                  <button 
                    onClick={() => setDeleteConfirmId(item._id)}
                    className="absolute top-2 right-2 p-1.5 bg-white text-rose-600 rounded-md opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 text-xs truncate text-slate-600">
                  {item.fileName}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Delete Media Asset"
        message="Are you sure you want to permanently delete this media asset? This action cannot be undone."
        isDestructive={true}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
