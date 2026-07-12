const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// 1. Add import
if (!code.includes("import { MediaLibrary }")) {
  code = code.replace(/import { ExtensionImporter } from '\.\.\/components\/admin\/ExtensionImporter';/, "import { ExtensionImporter } from '../components/admin/ExtensionImporter';\nimport { MediaLibrary } from '../components/MediaLibrary';");
}

// 2. Update type
code = code.replace(
  /'products' \| 'categories' \| 'blogs' \| 'messages' \| 'telemetry' \| 'scheduler' \| 'users' \| 'security-logs' \| 'importer'/,
  "'products' | 'categories' | 'blogs' | 'messages' | 'telemetry' | 'scheduler' | 'users' | 'security-logs' | 'importer' | 'media'"
);

// 3. Add tab button
if (!code.includes("setActiveTab('media')")) {
  const tabStr = `
        <button
          onClick={() => setActiveTab('media')}
          className={\`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors \${activeTab === 'media' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}\`}
        >
          🖼️ Media Library
        </button>
      </div>`;

  code = code.replace(/<\/div>\s*\{\/\* 3\. DYNAMIC WORKVIEW SECTION GRID TABLES \*\/\}/, tabStr + '\n\n      {/* 3. DYNAMIC WORKVIEW SECTION GRID TABLES */}');
}

// 4. Add view logic
if (!code.includes("<MediaLibrary token={token} />")) {
  const viewStr = `
          ) : activeTab === 'media' ? (
            <MediaLibrary token={token} />
          ) : activeTab === 'importer' ? (`

  code = code.replace(/\) : activeTab === 'importer' \? \(/, viewStr);
}

fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('Fixed Media tab in Admin.tsx');
