import re

with open('server.ts', 'r') as f:
    content = f.read()

# Google OAuth
google_oauth_old = """        const payload = ticket.getPayload();
        if (payload && payload.email) {
          return {
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
          };
        }"""

google_oauth_new = """        const payload = ticket.getPayload();
        if (payload && payload.email) {
          if (!payload.email_verified) return null;
          return {
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
          };
        }"""

content = content.replace(google_oauth_old, google_oauth_new)

# Firebase verification
firebase_old = """      if (decodedToken.payload.iss !== issuer || decodedToken.payload.aud !== firebaseProjectId) {
        console.error('Firebase token verification failed: invalid issuer or audience');
        return null;
      }"""

firebase_new = """      if (decodedToken.payload.iss !== issuer || decodedToken.payload.aud !== firebaseProjectId) {
        console.error('Firebase token verification failed: invalid issuer or audience');
        return null;
      }
      if (!decodedToken.payload.email_verified) {
        console.error('Firebase token verification failed: email not verified');
        return null;
      }"""

content = content.replace(firebase_old, firebase_new)

with open('server.ts', 'w') as f:
    f.write(content)
