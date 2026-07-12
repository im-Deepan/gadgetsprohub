import re

with open('server.ts', 'r') as f:
    content = f.read()

model_code = """
const authCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 } // 1 minute expiry
});
const AuthCode = mongoose.model('AuthCode', authCodeSchema);
"""

# Insert model code around line 550
idx = content.find("const BlacklistedToken")
if idx != -1:
    idx2 = content.find(";", idx)
    content = content[:idx2+1] + "\n" + model_code + content[idx2+1:]

# Replace createPendingAuthCode
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

# Wait, createPendingAuthCode is now async!
# We need to find where it's used.
