import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';

export interface UploadRecord {
  id: number;
  filename: string; // stored filename on disk
  originalName?: string; // original client filename if available
  mimeType?: string;
  sizeBytes?: number;
  url: string; // public URL to access the file
  uploaderId?: number; // from JWT if available
  createdAt: string; // ISO date
}

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'uploads.json');

async function ensureFile() {
  try {
    if (!fssync.existsSync(dataDir)) {
      await fs.mkdir(dataDir, { recursive: true });
    }
    if (!fssync.existsSync(filePath)) {
      await fs.writeFile(filePath, '[]', 'utf-8');
    }
  } catch (e) {
    // noop
  }
}

export async function readAllUploads(): Promise<UploadRecord[]> {
  await ensureFile();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as UploadRecord[];
  } catch {
    return [];
  }
}

export async function addUploadRecord(record: Omit<UploadRecord, 'id' | 'createdAt'>): Promise<UploadRecord> {
  await ensureFile();
  const all = await readAllUploads();
  const newRec: UploadRecord = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    ...record,
  };
  all.push(newRec);
  await fs.writeFile(filePath, JSON.stringify(all, null, 2));
  return newRec;
}

export async function getUploadsByUser(uploaderId: number): Promise<UploadRecord[]> {
  const all = await readAllUploads();
  return all.filter(u => u.uploaderId === uploaderId);
}
