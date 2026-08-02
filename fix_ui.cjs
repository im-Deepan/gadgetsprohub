const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const additionalStates = `
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [simulatedResetUrl, setSimulatedResetUrl] = useState('');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      setIsForgotPassword(true);
    }
  }, []);
`;

code = code.replace(/const \[email, setEmail\] = useState\(''\);/g, additionalStates + "\n  const [email, setEmail] = useState('');");

fs.writeFileSync('src/pages/Login.tsx', code);
