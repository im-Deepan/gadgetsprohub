import re

with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("const authCode = createPendingAuthCode", "const authCode = await createPendingAuthCode")

create_func_old = """  const createPendingAuthCode = (userId: string): string => {
    const code = crypto.randomBytes(16).toString('hex');
    pendingAuthCodes.set(code, {
      userId,
      expiresAt: Date.now() + 60 * 1000 // valid for 1 minute
    });
    return code;
  };"""

create_func_new = """  const createPendingAuthCode = async (userId: string): Promise<string> => {
    const code = crypto.randomBytes(16).toString('hex');
    if (isMongoConnected) {
      await AuthCode.create({ code, userId });
    } else {
      pendingAuthCodes.set(code, { userId, expiresAt: Date.now() + 60000 });
    }
    return code;
  };"""
content = content.replace(create_func_old, create_func_new)

with open('server.ts', 'w') as f:
    f.write(content)
