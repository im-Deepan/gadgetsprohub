const fs = require('fs');
let code = fs.readFileSync('src/components/MediaLibrary.tsx', 'utf8');

// Add new stat cards
const newCards = `
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
      </div>`;

code = code.replace(/<\/div>\s*<div className="bg-white rounded-xl/, newCards + '\n\n      <div className="bg-white rounded-xl');

// Add column count change to 6
code = code.replace(/<div className="grid grid-cols-4 gap-4">/, '<div className="grid grid-cols-3 md:grid-cols-6 gap-4">');

fs.writeFileSync('src/components/MediaLibrary.tsx', code);
console.log('Updated Media UI');
