const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const forgotPasswordRoutes = `
  // Forgot Password
  app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required.' });
      
      const storageEmail = getStorageEmail(email);
      let resetToken = crypto.randomBytes(32).toString('hex');
      let resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      let targetUser = null;

      if (isMongoConnected) {
        targetUser = await User.findOne({ email: storageEmail });
        if (targetUser) {
          targetUser.resetPasswordToken = resetToken;
          targetUser.resetPasswordExpiresAt = resetExpiresAt;
          await targetUser.save();
        }
      } else {
        targetUser = localUsers.find(u => u.email === storageEmail);
        if (targetUser) {
          targetUser.resetPasswordToken = resetToken;
          targetUser.resetPasswordExpiresAt = resetExpiresAt;
          saveLocalUsers();
        }
      }

      const proto = (Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto']) || (req.secure ? 'https' : 'http');
      const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
      const resetUrl = \`\${proto}://\${host}/login?resetToken=\${resetToken}\`;

      let emailSent = false;
      let smtpErrorMsg = '';

      if (targetUser && transporter) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'GadgetsProHub <noreply@gadgetsprohub.com>',
            to: targetUser.email,
            subject: 'Password Reset Request',
            html: \`
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <h2 style="margin: 0; color: #111827;">Password Reset</h2>
                </div>
                <div style="padding: 20px; color: #374151;">
                  <p>We received a request to reset your password. Click the button below to choose a new one:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="\${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                  </div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">If you didn't request this, you can safely ignore this email.</p>
                </div>
              </div>
            \`
          });
          emailSent = true;
        } catch (err) {
          smtpErrorMsg = err.message;
        }
      } else if (targetUser) {
        console.log(\`[SIMULATED PASSWORD RESET] User: \${targetUser.email} - Reset link: \${resetUrl}\`);
      }

      return res.json({ 
        success: true, 
        message: 'If an account matches that email, a password reset link has been sent.',
        smtpError: smtpErrorMsg || (!transporter ? 'SMTP transporter not configured' : ''),
        resetUrlSimulated: (targetUser && process.env.NODE_ENV !== 'production') ? resetUrl : undefined
      });
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
  });

  // Reset Password
  app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required.' });

      if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

      let targetUser = null;
      const hashed = await bcrypt.hash(newPassword, 10);

      if (isMongoConnected) {
        targetUser = await User.findOne({ 
          resetPasswordToken: token,
          resetPasswordExpiresAt: { $gt: new Date() }
        });
        if (targetUser) {
          targetUser.password = hashed;
          targetUser.resetPasswordToken = undefined;
          targetUser.resetPasswordExpiresAt = undefined;
          await targetUser.save();
        }
      } else {
        targetUser = localUsers.find(u => u.resetPasswordToken === token && new Date(u.resetPasswordExpiresAt) > new Date());
        if (targetUser) {
          targetUser.password = hashed;
          targetUser.resetPasswordToken = undefined;
          targetUser.resetPasswordExpiresAt = undefined;
          saveLocalUsers();
        }
      }

      if (!targetUser) {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }

      return res.json({ success: true, message: 'Password has been successfully reset. You can now log in.' });
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while resetting your password.' });
    }
  });

`;

code = code.replace("app.get('/api/auth/verify'", forgotPasswordRoutes + "app.get('/api/auth/verify'");
fs.writeFileSync('server.ts', code);
