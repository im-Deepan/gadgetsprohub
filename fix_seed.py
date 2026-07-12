import re

with open('server.ts', 'r') as f:
    content = f.read()

seed_old = """  app.post('/api/admin/seed', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { clearOnly } = req.body;"""

seed_new = """  app.post('/api/admin/seed', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { clearOnly, confirmation } = req.body;
      if (clearOnly && confirmation !== 'I_AM_SURE') {
        return res.status(400).json({ error: 'Requires confirmation="I_AM_SURE" to clear database' });
      }"""

content = content.replace(seed_old, seed_new)

with open('server.ts', 'w') as f:
    f.write(content)
