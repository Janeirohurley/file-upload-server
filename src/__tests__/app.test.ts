import request from 'supertest';
import app from '../app';

describe('Test API', () => {
  it('GET / doit retourner un 200 et un message', async () => {
    const res = await request(app).get('/');

    // ce que on attent 
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Bienvenue');
  });
});
