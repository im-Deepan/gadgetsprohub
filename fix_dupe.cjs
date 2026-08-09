const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const markerStart = '${escapeHTML(product.brand || ';
const markerEnd = 'Premium Brand\')}';

const indexStart = content.indexOf(markerStart);
if (indexStart !== -1) {
  // Find where the markerEnd is. Since the rest of the file was inserted between markerStart and markerEnd,
  // markerEnd is at the very end of the inserted chunk.
  // Wait, there is a second 'Premium Brand')}' ?
  const indexEnd = content.lastIndexOf(markerEnd);
  
  if (indexEnd !== -1) {
     // The duplicated chunk is between indexStart + markerStart.length and indexEnd
     // The actual correct text there should just be "'Premium Brand')}"
     // Wait!
     // Original: ... ${product.brand || 'Premium Brand'} ...rest of file...
     // Now: ... ${escapeHTML(product.brand || ...rest of file... Premium Brand')} ...rest of file...
     
     // So we want to remove the inserted "...rest of file..."
     // To do that, we can just replace everything from markerStart to indexEnd + markerEnd.length
     // with `\${escapeHTML(product.brand || 'Premium Brand')}`
     
     content = content.substring(0, indexStart) + 
               "${escapeHTML(product.brand || 'Premium Brand')}" + 
               content.substring(indexEnd + markerEnd.length);
               
     fs.writeFileSync('server.ts', content);
     console.log("Fixed duplication!");
  } else {
     console.log("Could not find markerEnd");
  }
} else {
  console.log("Could not find markerStart");
}
