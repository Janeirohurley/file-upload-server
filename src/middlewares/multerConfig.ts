import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, suffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const isImage = file.mimetype.startsWith('image/');
  const isAudio = ['audio/mpeg', 'audio/wav'].includes(file.mimetype);
  const fileSize = parseInt(req.headers['content-length'] || '0', 10);

  if (isImage && fileSize <= 2 * 1024 * 1024) return cb(null, true);
  if (isAudio && fileSize <= 1 * 1024 * 1024) return cb(null, true);

  cb(new Error('Fichier non supporté ou trop volumineux'));
};

export const upload = multer({ storage, fileFilter });
