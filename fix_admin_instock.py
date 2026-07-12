import re

with open('src/pages/Admin.tsx', 'r') as f:
    content = f.read()

instock_old = """      affiliateCode: prodForm.affiliateCode,
      inStock: true,
      trending: prodForm.trending,"""

instock_new = """      affiliateCode: prodForm.affiliateCode,
      inStock: prodForm.inStock !== false,
      trending: prodForm.trending,"""

content = content.replace(instock_old, instock_new)

ui_old = """                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prodForm.trending}"""

ui_new = """                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prodForm.inStock !== false}
                        onChange={(e) => setProdForm({ ...prodForm, inStock: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-200 text-indigo-500 focus:ring-indigo-400"
                      />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-widest text-[10px]">In Stock</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prodForm.trending}"""

content = content.replace(ui_old, ui_new)

with open('src/pages/Admin.tsx', 'w') as f:
    f.write(content)
