const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const s1 = code.indexOf('<form onSubmit={handleSubmit}');
const s2 = code.indexOf('</form>') + 7;
let form = code.substring(s1, s2);

// Remove the `isForgotPassword ? (...) : (<>` part from where it is now.
const match = form.match(/\{isForgotPassword \? \([\s\S]*?\) \: \(\<\>/);
const forgotStr = match[0];

// Remove the `</>)}` at the end
form = form.replace('</>)}</form>', '</form>');
form = form.replace(forgotStr, '');

// Now form is just the pure form. We want to wrap its children in `{isForgotPassword ? (...) : (<> ... </>)}`.
// First, extract the forgot UI content from `forgotStr`
const forgotContent = forgotStr.substring('{isForgotPassword ? ('.length, forgotStr.length - ') : (<>'.length);

const errDisplay = '<LoginErrorDisplay error={authError} onClear={() => setAuthError(\'\')} />';
const afterErrIndex = form.indexOf(errDisplay) + errDisplay.length;

const before = form.substring(0, afterErrIndex);
const after = form.substring(afterErrIndex, form.length - 7); // excluding </form>

const newForm = `${before}\n{isForgotPassword ? (${forgotContent}) : (<>${after}</>)}\n</form>`;

code = code.substring(0, s1) + newForm + code.substring(s2);
fs.writeFileSync('src/pages/Login.tsx', code);

