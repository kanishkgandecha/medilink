const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/avatars')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${req.user._id}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const avatarFilter = (req, file, cb) => {
  const allowed = new Map([
    ['.jpg', ['image/jpeg']], ['.jpeg', ['image/jpeg']], ['.png', ['image/png']],
    ['.gif', ['image/gif']], ['.webp', ['image/webp']],
  ]);
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.get(ext)?.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only matching JPEG, PNG, GIF, or WebP image files are allowed'), false);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
}).single('avatar');

const hasValidImageSignature = (buffer, mimetype) => {
  if (mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (mimetype === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
  if (mimetype === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
};

const validateAvatarSignature = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const handle = await fs.open(req.file.path, 'r');
    const header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
    await handle.close();
    if (!hasValidImageSignature(header, req.file.mimetype)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ success: false, message: 'Uploaded file content is not a valid supported image' });
    }
    next();
  } catch (_error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ success: false, message: 'Unable to validate uploaded image' });
  }
};

module.exports = { uploadAvatar, validateAvatarSignature, hasValidImageSignature };
