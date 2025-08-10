import fs from 'fs/promises';
import path from 'path';
import { User } from '../models/User';

const filePath = path.join(__dirname, '..', 'data', 'users.json');

export const readUsers = async (): Promise<User[]> => {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
};

export const writeUsers = async (users: User[]) => {
    await fs.writeFile(filePath, JSON.stringify(users, null, 2));
};
