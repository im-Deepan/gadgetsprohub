sed -i '105i \
const sanitizeUser = (userObj: any) => {\n\
  if (!userObj) return userObj;\n\
  const clean = userObj.toObject ? userObj.toObject() : { ...userObj };\n\
  delete clean.password;\n\
  delete clean.verificationToken;\n\
  delete clean.pendingEmailToken;\n\
  return clean;\n\
};\n' server.ts
