import re

with open('server.ts', 'r') as f:
    content = f.read()

location_old = """    let detectedCity = 'Chennai';

    try {
      // Try ipapi.co
      const response = await fetch('https://ipapi.co/json/');"""

location_new = """    let detectedCity = 'Chennai';
    let clientIp = (_req.headers['x-forwarded-for'] || _req.socket.remoteAddress || '').toString().split(',')[0].trim();
    if (clientIp.startsWith('::ffff:')) clientIp = clientIp.substring(7);

    try {
      // Try ipapi.co
      const ipParam = (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') ? `${clientIp}/` : '';
      const response = await fetch(`https://ipapi.co/${ipParam}json/`);"""

content = content.replace(location_old, location_new)

location_old2 = """      // Fallback to freeipapi
      const fallbackResponse = await fetch('https://freeipapi.com/api/json');"""

location_new2 = """      // Fallback to freeipapi
      const fallbackResponse = await fetch(`https://freeipapi.com/api/json${ipParam ? '/' + ipParam.replace('/', '') : ''}`);"""

content = content.replace(location_old2, location_new2)

with open('server.ts', 'w') as f:
    f.write(content)
