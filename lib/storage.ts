import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = process.env.SIMPLECAPTION_DATA ?? path.join(process.cwd(), 'data');

function safeId(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Invalid id: ${id}`);
  return id;
}

export function dataDir(): string { return DATA_DIR; }

export function uploadDir(id: string): string {
  return path.join(DATA_DIR, 'uploads', safeId(id));
}
export function renderDir(id: string): string {
  return path.join(DATA_DIR, 'renders', safeId(id));
}
export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
