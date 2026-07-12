const fs = require('fs');
let code = fs.readFileSync('extension/src/popup/Popup.tsx', 'utf8');

// Import the component
const importStr = "import { BulkImportTab } from './components/BulkImportTab';";
code = code.replace("import { Package, Search,", importStr + "\nimport { Package, Search,");
code = code.replace("import { Database } from 'lucide-react';", "import { Database, Layers } from 'lucide-react';");

// Add to the Tab Bar
const tabNav = `
          <button
            onClick={() => setActiveTab('bulk')}
            className={\`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors \${activeTab === 'bulk' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/50' : 'text-slate-500 hover:bg-slate-50'}\`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Bulk</span>
          </button>
`;
code = code.replace("</nav>", tabNav + "\n        </nav>");

// Render the component
const renderStr = `
        ) : activeTab === 'bulk' ? (
          <BulkImportTab />
`;
code = code.replace(") : activeTab === 'history' ? (", renderStr + "\n        ) : activeTab === 'history' ? (");

fs.writeFileSync('extension/src/popup/Popup.tsx', code);
console.log('Wired BulkImportTab into Popup.tsx');
