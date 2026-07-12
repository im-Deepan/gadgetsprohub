import re

with open('src/context/AuthContext.tsx', 'r') as f:
    content = f.read()

auth_old = """        if (data.token) {
          setToken(data.token);
          if (emailUpdated === 'true') {
            showToast('Your new email address has been successfully verified and updated on your account record!', 'success', 6000, 'User Action');
          } else {
            showToast('Your email has been successfully verified! You have been logged in automatically.', 'success', 5000, 'User Action');
          }
        }"""

auth_new = """        if (data.token) {
          setToken(data.token);
          refreshProfile().catch(() => {});
          if (emailUpdated === 'true') {
            showToast('Your new email address has been successfully verified and updated on your account record!', 'success', 6000, 'User Action');
          } else {
            showToast('Your email has been successfully verified! You have been logged in automatically.', 'success', 5000, 'User Action');
          }
        }"""

content = content.replace(auth_old, auth_new)

with open('src/context/AuthContext.tsx', 'w') as f:
    f.write(content)
