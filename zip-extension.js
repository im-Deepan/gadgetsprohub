import AdmZip from 'adm-zip';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const zip = new AdmZip();
const sourceDir = path.resolve(__dirname, 'extension/dist');
const outPath = path.resolve(__dirname, 'public/extension.zip');

zip.addLocalFolder(sourceDir);
zip.writeZip(outPath);
console.log(`Successfully created ${outPath}`);
