import express from 'express';
import { createUser, findUserByEmail, verifyPassword } from '../utils/userFileDB';
import jwt from 'jsonwebtoken';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'secret_key';

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = await createUser(username, email, password);
    res.status(201).json({ message: 'Utilisateur créé', user: { id: user.id, email: user.email } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);

  if (!user || !(await verifyPassword(user, password))) {
    return res.status(401).json({ error: 'Email ou mot de passe invalide' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

export default router;
