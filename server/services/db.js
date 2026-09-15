import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function readDB() {
  if (!existsSync(DB_FILE)) return { sessions: [] };
  try {
    return JSON.parse(readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { sessions: [] };
  }
}

function writeDB(data) {
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export class SessionStore {
  create(metadata = {}) {
    const db = readDB();
    const session = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      metadata,
      frames: []
    };
    db.sessions.push(session);
    writeDB(db);
    // Return without frames array (keep response small)
    return { id: session.id, createdAt: session.createdAt, metadata: session.metadata };
  }

  listAll() {
    const db = readDB();
    return db.sessions.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      metadata: s.metadata,
      frameCount: s.frames.length
    }));
  }

  getById(id) {
    const db = readDB();
    return db.sessions.find(s => s.id === id) || null;
  }

  addFrames(id, frames) {
    const db = readDB();
    const session = db.sessions.find(s => s.id === id);
    if (!session) return false;
    session.frames.push(...frames);
    writeDB(db);
    return true;
  }

  delete(id) {
    const db = readDB();
    const idx = db.sessions.findIndex(s => s.id === id);
    if (idx === -1) return false;
    db.sessions.splice(idx, 1);
    writeDB(db);
    return true;
  }
}
