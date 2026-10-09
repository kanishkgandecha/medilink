const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const fsSync = require('fs');

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

// Report attachments (lab/radiology results): stored outside the publicly
// served /uploads static directory — only reachable through the authorized
// download controller, never a direct URL.
const REPORT_ATTACHMENT_DIR = path.join(__dirname, '../private-uploads/report-attachments');
fsSync.mkdirSync(REPORT_ATTACHMENT_DIR, { recursive: true });

const reportAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, REPORT_ATTACHMENT_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const REPORT_ATTACHMENT_TYPES = new Map([
  ['.pdf', ['application/pdf']],
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.png', ['image/png']],
]);

const reportAttachmentFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (REPORT_ATTACHMENT_TYPES.get(ext)?.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPEG, or PNG files are allowed'), false);
  }
};

const uploadReportAttachment = multer({
  storage: reportAttachmentStorage,
  fileFilter: reportAttachmentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('attachment');

const hasValidReportFileSignature = (buffer, mimetype) => {
  if (mimetype === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  return hasValidImageSignature(buffer, mimetype);
};

const validateReportAttachmentSignature = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const handle = await fs.open(req.file.path, 'r');
    const header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
    await handle.close();
    if (!hasValidReportFileSignature(header, req.file.mimetype)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ success: false, message: 'Uploaded file content is not a valid supported PDF/JPEG/PNG' });
    }
    next();
  } catch (_error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ success: false, message: 'Unable to validate uploaded file' });
  }
};

module.exports = {
  uploadAvatar,
  validateAvatarSignature,
  hasValidImageSignature,
  REPORT_ATTACHMENT_DIR,
  uploadReportAttachment,
  validateReportAttachmentSignature,
  hasValidReportFileSignature,
};
