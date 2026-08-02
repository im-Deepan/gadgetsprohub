const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');
code = code.replace(/import \{ Lock, Mail, User, ShieldCheck, ArrowLeft, Eye, EyeOff \} from 'lucide-react';/g, "import { Lock, Mail, User, ShieldCheck, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';");
fs.writeFileSync('src/pages/Login.tsx', code);
