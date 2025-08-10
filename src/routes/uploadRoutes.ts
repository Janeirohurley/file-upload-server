import express from 'express';
import { uploadFile, uploadBlob } from '../controllers/uploadController';
import { upload } from '../middlewares/multerConfig';
import { errorHandler } from '../middlewares/errorHandler';
import { requireAuth } from '../middlewares/auth';

const router = express.Router();
/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload d’un fichier unique (multipart)
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Fichier uploadé avec succès
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 *
 * /upload/blob:
 *   post:
 *     summary: Upload d’un fichier blob (base64, JSON)
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Upload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 example: "monfichier.png"
 *               mimeType:
 *                 type: string
 *                 example: "image/png"
 *               data:
 *                 type: string
 *                 description: Données encodées en base64
 *     responses:
 *       201:
 *         description: Blob uploadé avec succès
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

router.post('/', errorHandler, requireAuth, upload.single('file'), uploadFile);
router.post('/blob', errorHandler, requireAuth, uploadBlob);

export default router;