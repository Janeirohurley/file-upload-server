import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const uploadFile = (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ message: 'Upload réussi', fileUrl });
};

export const uploadBlob = (req: Request, res: Response) => {
  try {
    if (!req.body || !req.body.length)
      return res.status(400).json({ error: 'Audio manquant' });

    const contentType = req.headers['content-type'];
    const ext = contentType === 'audio/wav' ? '.wav' : '.mp3';
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    fs.writeFileSync(path.join(uploadDir, name), req.body);

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${name}`;
    res.status(200).json({ message: 'Upload blob réussi', fileUrl });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
};