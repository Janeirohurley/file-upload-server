import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

const filePath = path.join(__dirname, '../data/users.json');

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
}

const readUsers = (): User[] => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writeUsers = (users: User[]) => {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
};

export const findUserByEmail = (email: string): User | undefined => {
  return readUsers().find(user => user.email === email);
};

export const createUser = async (username: string, email: string, password: string): Promise<User> => {
  const users = readUsers();

  if (users.find(u => u.email === email)) {
    throw new Error('Email déjà utilisé');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: Date.now(),
    username,
    email,
    passwordHash,
  };

  users.push(newUser);
  writeUsers(users);
  return newUser;
};

export const verifyPassword = async (user: User, password: string): Promise<boolean> => {
  return bcrypt.compare(password, user.passwordHash);
};
