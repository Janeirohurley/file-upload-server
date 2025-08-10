// controllers/userController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { readUsers, writeUsers } from '../utils/fileDB';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

// Créer un utilisateur
export const register = async (req: Request, res: Response) => {
  const { username, password, email } = req.body;
  const users = await readUsers();

  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: 'Utilisateur déjà existant' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ message: 'Email déjà utilisé' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: Date.now(),
    username,
    email,
    passwordHash: hashedPassword,
  };

  users.push(newUser);
  await writeUsers(users);

  res.status(201).json({ id: newUser.id, username, email });
};

// Se connecter
export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const users = await readUsers();

  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ message: 'Identifiants invalides' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Mot de passe incorrect' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
};

// Lire tous les utilisateurs
export const getAllUsers = async (_req: Request, res: Response) => {
  const users = await readUsers();
  const safeUsers = users.map(({ passwordHash, ...rest }) => rest); // Sans mot de passe
  res.json(safeUsers);
};

// Lire un utilisateur par ID
export const getUserById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const users = await readUsers();
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
};

// Mettre à jour un utilisateur
export const updateUser = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { username, email, password } = req.body;
  const users = await readUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ message: 'Utilisateur non trouvé' });

  if (username) users[index].username = username;
  if (email) users[index].email = email;
  if (password) users[index].passwordHash = await bcrypt.hash(password, 10);

  await writeUsers(users);
  const { passwordHash, ...safeUser } = users[index];
  res.json(safeUser);
};

// Supprimer un utilisateur
export const deleteUser = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const users = await readUsers();
  const filtered = users.filter(u => u.id !== id);

  if (filtered.length === users.length) {
    return res.status(404).json({ message: 'Utilisateur non trouvé' });
  }

  await writeUsers(filtered);
  res.json({ message: 'Utilisateur supprimé avec succès' });
};
