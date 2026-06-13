import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // color fixes
  content = content.replace(/-850/g, '-800');
  content = content.replace(/-955/g, '-950');
  content = content.replace(/-455/g, '-400');
  content = content.replace(/-605/g, '-600');
  content = content.replace(/-650/g, '-600');
  content = content.replace(/-655/g, '-600');
  content = content.replace(/-805/g, '-800');
  content = content.replace(/-705/g, '-700');
  content = content.replace(/-150/g, '-100');
  content = content.replace(/-205/g, '-200');
  content = content.replace(/-550/g, '-500');
  content = content.replace(/-450/g, '-400');
  content = content.replace(/-505/g, '-500');
  content = content.replace(/-355/g, '-300');
  content = content.replace(/animat-pulse/g, 'animate-pulse');

  // Any other things?
  // "#0c1224" -> "slate-900" or similar
  content = content.replace(/bg-\[#0c1224\]/g, 'bg-slate-900');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
