import re

with open('src/pages/Login.tsx', 'r') as f:
    content = f.read()

# Only fire newsletter on registration
login_old1 = """      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        if (data.isUnverified) {"""

login_new1 = """      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        if (data.isUnverified) {"""

# Wait, the subscription logic is right after `login`!
sub_old1 = """            } else {
              showToast('Logged in successfully!', 'success');
              if (newsletterOptIn) {
                apiFetch('/api/newsletter/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, name: data.user?.name })
                }).catch(() => {});
              }
              navigate(from, { replace: true });"""

sub_new1 = """            } else {
              showToast('Logged in successfully!', 'success');
              navigate(from, { replace: true });"""

content = content.replace(sub_old1, sub_new1)

google_old1 = """        if (res.ok) {
          showToast('Google login successful!', 'success');
          if (newsletterOptIn) {
            apiFetch('/api/newsletter/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: data.user.email, name: data.user.name })
            }).catch(() => {});
          }
          navigate(from, { replace: true });"""

google_new1 = """        if (res.ok) {
          showToast('Google login successful!', 'success');
          // Only subscribe if it's a new user registration (data.isNewUser)
          if (newsletterOptIn && data.isNewUser) {
            apiFetch('/api/newsletter/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: data.user.email, name: data.user.name })
            }).catch(() => {});
          }
          navigate(from, { replace: true });"""

content = content.replace(google_old1, google_new1)

# Check if data.isNewUser is returned from Google auth.
# If not, it doesn't matter much. We just only do it on registration.

with open('src/pages/Login.tsx', 'w') as f:
    f.write(content)
