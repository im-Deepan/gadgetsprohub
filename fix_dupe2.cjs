const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const markerStart = '${escapeHTML(product.description || ';
const markerEnd = 'View details and latest specifications on our site.\')}';

const indexStart = content.indexOf(markerStart);
if (indexStart !== -1) {
  const indexEnd = content.lastIndexOf(markerEnd);
  
  if (indexEnd !== -1) {
     content = content.substring(0, indexStart) + 
               "${escapeHTML(product.description || 'View details and latest specifications on our site.')}" + 
               content.substring(indexEnd + markerEnd.length);
               
     fs.writeFileSync('server.ts', content);
     console.log("Fixed duplication 2!");
  } else {
     console.log("Could not find markerEnd");
  }
} else {
  console.log("Could not find markerStart");
}
