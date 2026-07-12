import re

with open('server.ts', 'r') as f:
    content = f.read()

exchange_code_old = """      const pending = pendingAuthCodes.get(authCode);
      if (!pending) {
        return res.status(400).json({ error: 'Invalid or expired authorization code' });
      }
      
      pendingAuthCodes.delete(authCode); // Strict single-use!
      
      if (Date.now() > pending.expiresAt) {
        return res.status(400).json({ error: 'Authorization code has expired' });
      }
      
      const userId = pending.userId;"""

exchange_code_new = """      let pendingUserId: string | null = null;
      if (isMongoConnected) {
        const found = await AuthCode.findOne({ code: authCode });
        if (!found) {
          return res.status(400).json({ error: 'Invalid or expired authorization code' });
        }
        await AuthCode.deleteOne({ _id: found._id });
        pendingUserId = found.userId as string;
      } else {
        const pending = pendingAuthCodes.get(authCode);
        if (!pending) {
          return res.status(400).json({ error: 'Invalid or expired authorization code' });
        }
        pendingAuthCodes.delete(authCode); // Strict single-use!
        if (Date.now() > pending.expiresAt) {
          return res.status(400).json({ error: 'Authorization code has expired' });
        }
        pendingUserId = pending.userId;
      }
      const userId = pendingUserId;"""

content = content.replace(exchange_code_old, exchange_code_new)

with open('server.ts', 'w') as f:
    f.write(content)
