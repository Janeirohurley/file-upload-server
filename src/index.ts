
import express, { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// Utiliser CommonJS __dirname
// (Pas besoin de redéclarer __dirname, il est déjà disponible globalement dans Node.js)

const app = express();
const port = 3000;

// Activer CORS
app.use(cors());

// Servir les fichiers statiques depuis le dossier uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configurer Multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // Créer le dossier uploads s'il n'existe pas
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Générer un nom de fichier unique avec timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtrer les fichiers pour accepter :
// - toutes les images (image/*) jusqu'à 2 Mo
// - audio (audio/mpeg, audio/wav) jusqu'à 1 Mo
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const isImage = file.mimetype.startsWith('image/');
  const isAudio = file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/wav';
  const fileSize = parseInt(req.headers['content-length'] || '0', 10);

  if (isImage) {
    if (fileSize > 2 * 1024 * 1024) {
      return cb(new Error('Image trop volumineuse (max 2 Mo).'));
    }
    return cb(null, true);
  }
  if (isAudio) {
    if (fileSize > 1 * 1024 * 1024) {
      return cb(new Error('Fichier audio trop volumineux (max 1 Mo).'));
    }
    return cb(null, true);
  }
  cb(new Error('Type de fichier non supporté. Seules les images et audio (mp3, wav) sont acceptées.'));
};

const upload = multer({ storage, fileFilter });

// Route pour uploader un fichier
app.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier uploadé ou type de fichier non supporté.' });
  }
  // Générer l'URL du fichier
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({
    message: 'Fichier uploadé avec succès',
    fileUrl: fileUrl
  });
});

// Pour accepter les blobs binaires (audio) envoyés en body brut
app.post('/upload-blob', express.raw({ type: ['audio/mpeg', 'audio/mp3', 'audio/wav'], limit: '2mb' }), (req: Request, res: Response) => {
  try {
    if (!req.body || !req.body.length) {
      return res.status(400).json({ error: 'Aucun contenu audio reçu.' });
    }
    // Vérifier la taille (max 1 Mo)
    if (req.body.length > 1 * 1024 * 1024) {
      return res.status(400).json({ error: 'Fichier audio trop volumineux (max 1 Mo).' });
    }
    // Déterminer l'extension
    let ext = '.mp3';
    const contentType = req.headers['content-type'];
    if (contentType === 'audio/wav') ext = '.wav';
    // Générer un nom de fichier unique
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    const filePath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(filePath, req.body);
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${uniqueName}`;
    res.status(200).json({
      message: 'Fichier audio binaire uploadé avec succès',
      fileUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la sauvegarde du fichier audio.' });
  }
});

// Route de test
app.get('/', (req: Request, res: Response) => {
  res.send('Serveur API de fichiers en ligne !');
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur en écoute sur http://localhost:${port}`);
});