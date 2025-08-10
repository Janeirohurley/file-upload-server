// src/__tests__/upload.test.ts
import request from 'supertest';
import app from '../app';
import path from 'path';

describe('POST /api/v1/upload', () => {
    it('devrait uploader un fichier avec succès', async () => {
        const filePath = path.join(__dirname, 'fixtures', 'testfile.txt');

        const res = await request(app)
            .post('/api/v1/upload') // adapte au chemin réel
            .attach('file', filePath); // "file" doit correspondre au champ Multer

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('message', 'Fichier uploadé');
        expect(res.body).toHaveProperty('filename');
    });
});
