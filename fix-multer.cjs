const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const upload = multer\(\{ dest: 'public\/uploads\/temp\/' \}\);/,
  `const upload = multer({ 
    dest: 'public/uploads/temp/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'));
      }
    }
  });`
);
fs.writeFileSync('server.ts', code);
