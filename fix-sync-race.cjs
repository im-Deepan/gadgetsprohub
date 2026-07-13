const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /async function syncProductsToSeedFile\(\) \{/,
  `let isSyncingSeedData = false;
async function syncProductsToSeedFile() {
  if (isSyncingSeedData) return;
  isSyncingSeedData = true;
  try {`
);
code = code.replace(
  /console\.error\('Error in syncProductsToSeedFile:', err\.message\);\n\s*\}/,
  `console.error('Error in syncProductsToSeedFile:', err.message);
  } finally {
    isSyncingSeedData = false;
  }`
);

code = code.replace(
  /async function syncCategoriesToSeedFile\(\) \{/,
  `async function syncCategoriesToSeedFile() {
  if (isSyncingSeedData) return;
  isSyncingSeedData = true;
  try {`
);
code = code.replace(
  /console\.error\('Error in syncCategoriesToSeedFile:', err\.message\);\n\s*\}/,
  `console.error('Error in syncCategoriesToSeedFile:', err.message);
  } finally {
    isSyncingSeedData = false;
  }`
);

code = code.replace(
  /async function syncBlogsToSeedFile\(\) \{/,
  `async function syncBlogsToSeedFile() {
  if (isSyncingSeedData) return;
  isSyncingSeedData = true;
  try {`
);
code = code.replace(
  /console\.error\('Error in syncBlogsToSeedFile:', err\.message\);\n\s*\}/,
  `console.error('Error in syncBlogsToSeedFile:', err.message);
  } finally {
    isSyncingSeedData = false;
  }`
);

code = code.replace(
  /async function syncMessagesToSeedFile\(\) \{/,
  `async function syncMessagesToSeedFile() {
  if (isSyncingSeedData) return;
  isSyncingSeedData = true;
  try {`
);
code = code.replace(
  /console\.error\('Error in syncMessagesToSeedFile:', err\.message\);\n\s*\}/,
  `console.error('Error in syncMessagesToSeedFile:', err.message);
  } finally {
    isSyncingSeedData = false;
  }`
);

fs.writeFileSync('server.ts', code);
