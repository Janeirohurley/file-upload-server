import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { addUploadRecord } from '../utils/uploadDB';

export const uploadFile = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  // @ts-ignore - req.user est défini par le middleware d'authentification
  const uploaderId = req.user?.id as number | undefined;

  try {
    await addUploadRecord({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      url: fileUrl,
      uploaderId,
    });

    res.status(201).json({ message: 'Upload réussi', fileUrl });
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des métadonnées' });
  }
};

export const uploadBlob = async (req: Request, res: Response) => {
  try {
    if (!req.body || !(req.body as any).length) {
      return res.status(400).json({ error: 'Audio manquant' });
    }

    const contentType = req.headers['content-type'];
    const ext = contentType === 'audio/wav' ? '.wav' : contentType === 'audio/mpeg' ? '.mp3' : '.bin';
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    fs.writeFileSync(path.join(uploadDir, name), req.body as any);

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${name}`;

    // @ts-ignore - req.user est défini par le middleware d'authentification
    const uploaderId = req.user?.id as number | undefined;

    await addUploadRecord({
      filename: name,
      mimeType: contentType,
      sizeBytes: Buffer.isBuffer(req.body) ? (req.body as Buffer).length : undefined,
      url: fileUrl,
      uploaderId,
    });

    res.status(201).json({ message: 'Upload blob réussi', fileUrl });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
};
