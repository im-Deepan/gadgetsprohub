const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const forgotHandler = `
    if (isForgotPassword && !resetToken) {
      if (!email) {
        setAuthError('Please enter your email address to reset your password.');
        setSubmitting(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (data.success) {
          setForgotPasswordSuccess(true);
          showToast(data.message, 'success', 5000, "User Action");
          if (data.resetUrlSimulated) {
            setSimulatedResetUrl(data.resetUrlSimulated);
          }
        } else {
          setAuthError(data.error || 'Failed to request password reset.');
        }
      } catch (e) {
        setAuthError('Network error occurred.');
      }
      setSubmitting(false);
      return;
    }

    if (isForgotPassword && resetToken) {
      if (!password || password.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        setSubmitting(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword: password })
        });
        const data = await response.json();
        if (data.success) {
          showToast(data.message, 'success', 5000, "User Action");
          setIsForgotPassword(false);
          setResetToken(null);
          setActiveTab('login');
          setPassword('');
        } else {
          setAuthError(data.error || 'Failed to reset password.');
        }
      } catch (e) {
        setAuthError('Network error occurred.');
      }
      setSubmitting(false);
      return;
    }

`;

code = code.replace(/if \(activeTab === 'login'\) {/g, forgotHandler + "    if (activeTab === 'login') {");
fs.writeFileSync('src/pages/Login.tsx', code);
