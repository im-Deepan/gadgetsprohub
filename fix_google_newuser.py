import re

with open('server.ts', 'r') as f:
    content = f.read()

google_newuser_old = """            user = await User.create({
              name: verifiedName,
              email: verifiedEmail,
              password: crypto.randomBytes(32).toString('hex'), // random password
              role: isAdminEmail(verifiedEmail) ? 'admin' : 'user',
              isVerified: true
            });"""

google_newuser_new = """            user = await User.create({
              name: verifiedName,
              email: verifiedEmail,
              password: crypto.randomBytes(32).toString('hex'), // random password
              role: isAdminEmail(verifiedEmail) ? 'admin' : 'user',
              isVerified: true
            });
            (user as any).isNewUser = true;"""

content = content.replace(google_newuser_old, google_newuser_new)

google_resp_old = """          res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
          });
          
          return res.json({ 
            token, 
            user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district || 'Chennai' } 
          });"""

google_resp_new = """          res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
          });
          
          return res.json({ 
            token, 
            isNewUser: !!(user as any).isNewUser,
            user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district || 'Chennai' } 
          });"""

content = content.replace(google_resp_old, google_resp_new)

with open('server.ts', 'w') as f:
    f.write(content)
