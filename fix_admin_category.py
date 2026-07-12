import re

with open('src/pages/Admin.tsx', 'r') as f:
    content = f.read()

cat_state_old = """  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catSubcategories, setCatSubcategories] = useState('');"""

cat_state_new = """  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catDescription, setCatDescription] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catSubcategories, setCatSubcategories] = useState('');"""

content = content.replace(cat_state_old, cat_state_new)

cat_payload_old = """          name: catName,
          slug: generateSlug(catSlug || catName),
          icon: catIcon || '📦',
          description: 'Custom added curator category',
          subcategories: catSubcategories.split(',').map(sub => sub.trim()).filter(Boolean)"""

cat_payload_new = """          name: catName,
          slug: generateSlug(catSlug || catName),
          icon: catIcon || '📦',
          description: catDescription || 'Custom added curator category',
          image: catImage || undefined,
          subcategories: catSubcategories.split(',').map(sub => sub.trim()).filter(Boolean)"""

content = content.replace(cat_payload_old, cat_payload_new)

cat_reset_old = """        setCatName('');
        setCatSlug('');
        setCatIcon('📦');
        setCatSubcategories('');"""

cat_reset_new = """        setCatName('');
        setCatSlug('');
        setCatIcon('📦');
        setCatDescription('');
        setCatImage('');
        setCatSubcategories('');"""

content = content.replace(cat_reset_old, cat_reset_new)

cat_ui_old = """                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Subcategories (comma separated)</label>"""

cat_ui_new = """                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                      <input
                        type="text"
                        value={catDescription}
                        onChange={(e) => setCatDescription(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="Category Description"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Image URL</label>
                      <input
                        type="text"
                        value={catImage}
                        onChange={(e) => setCatImage(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Subcategories (comma separated)</label>"""

content = content.replace(cat_ui_old, cat_ui_new)

with open('src/pages/Admin.tsx', 'w') as f:
    f.write(content)
