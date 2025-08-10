import request from 'supertest';
import app from '../app';
import fs from 'fs';
import path from 'path';

const usersFilePath = path.join(__dirname, '../../data/users.json');

describe('POST /api/v1/auth/register', () => {
    beforeEach(() => {
        // Nettoie le fichier des utilisateurs avant chaque test
        if (fs.existsSync(usersFilePath)) {
            fs.writeFileSync(usersFilePath, '[]', 'utf-8');
        }
    });

    it('devrait retourner un user créé dans le response {id,username,email}', async () => {
        const newUser = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'mypassword123'
        };

        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(newUser);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('username', newUser.username);
        expect(response.body).toHaveProperty('email', newUser.email);
        expect(response.body).not.toHaveProperty('password'); // on ne retourne pas le mot de passe
    });

    it('devrait retourner 409 si le username existe déjà', async () => {
        const existingUser = {
            username: 'testuser',//meme username
            email: 'different@example.com',//different email
            password: 'password123'
        };

        // Création initiale
        await request(app).post('/api/v1/auth/register').send(existingUser);

        // Deuxième tentative avec le même username
        const response = await request(app).post('/api/v1/auth/register').send({
            username: 'testuser',//meme username
            email: 'different@example.com',//different email
            password: 'password123'
        });

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty('message', 'Utilisateur déjà existant');
    });

    it('devrait retourner 409 si l\'email existe déjà', async () => {
        const existingUser = {
            username: 'testuser1',//different username
            email: 'test@example.com',//meme email
            password: 'password123'
        };

        await request(app).post('/api/v1/auth/register').send(existingUser);

        const response = await request(app).post('/api/v1/auth/register').send({
            username: 'testuser1',//different username
            email: 'test@example.com',//meme email
            password: 'password123'
        });

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty('message', 'Email déjà utilisé');
    });
});
