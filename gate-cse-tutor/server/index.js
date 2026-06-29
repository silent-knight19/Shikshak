import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { join, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });
const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error('GOOGLE_API_KEY environment variable is required');
  process.exit(1);
}

let serviceAccount = null;
const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (saPath) {
  try {
    serviceAccount = JSON.parse(saPath);
  } catch {
    const saFile = isAbsolute(saPath) ? saPath : join(__dirname, '..', saPath);
    if (existsSync(saFile)) {
      serviceAccount = JSON.parse(readFileSync(saFile, 'utf-8'));
    }
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  admin.initializeApp();
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

const MODEL_NAME_RE = /^[a-zA-Z0-9._-]+$/;

async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.post('/api/generate', verifyAuth, async (req, res) => {
  const { model, contents, systemInstruction, generationConfig } = req.body;

  if (!model || !MODEL_NAME_RE.test(model)) {
    res.status(400).json({ error: 'Invalid or missing model name' });
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?key=${encodeURIComponent(API_KEY)}`;

  let streamingStarted = false;

  try {
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction, generationConfig }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      res.status(apiRes.status).json({ error: err });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    streamingStarted = true;

    const reader = apiRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (err) {
    if (streamingStarted) {
      try { res.end(); } catch { }
    } else {
      res.status(500).json({ error: err?.message || String(err) });
    }
  }
});

app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
