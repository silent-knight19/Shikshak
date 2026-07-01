import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { join, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import admin from 'firebase-admin';
import { webSearch, fetchPageContent, multiSearch, fetchAllContent } from './search.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });
const app = express();
const PORT = process.env.PORT || 3001;
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;

if (!CEREBRAS_API_KEY) {
  console.error('CEREBRAS_API_KEY environment variable is required');
  process.exit(1);
}

const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
let serviceAccount = null;
if (saPath && saPath.trim().startsWith('{')) {
  try {
    serviceAccount = JSON.parse(saPath);
  } catch (e) {
    console.error('FIREBASE_SERVICE_ACCOUNT_PATH is set but is not valid JSON:', e.message);
  }
} else if (saPath) {
  const saFile = isAbsolute(saPath) ? saPath : join(__dirname, '..', saPath);
  if (existsSync(saFile)) {
    try {
      serviceAccount = JSON.parse(readFileSync(saFile, 'utf-8'));
    } catch (e) {
      console.error('Failed to parse service account file:', e.message);
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_PATH file not found:', saFile);
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.warn('Firebase Admin initialized without service account — auth will fail. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to the raw JSON from Firebase Console > Service Accounts > Generate new private key');
  admin.initializeApp();
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

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
  const url = 'https://api.cerebras.ai/v1/chat/completions';

  let streamingStarted = false;

  try {
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`
      },
      body: JSON.stringify(req.body),
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

app.post('/api/web-search', verifyAuth, async (req, res) => {
  const { query, count } = req.body;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'Missing query' });
    return;
  }
  try {
    const results = await webSearch(query, count ?? 5);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Search failed' });
  }
});

app.post('/api/fetch-content', verifyAuth, async (req, res) => {
  const { url, maxChars } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url' });
    return;
  }
  try {
    const result = await fetchPageContent(url, maxChars ?? 8000);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Fetch failed' });
  }
});

async function callCerebras(messages, options = {}) {
  const { model = 'gemma-4-31b', stream = false, temperature = 0.3, maxTokens = 256, signal } = options;
  const body = { model, messages, stream, temperature, max_completion_tokens: maxTokens };
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CEREBRAS_API_KEY}`
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cerebras error ${res.status}: ${err}`);
  }
  if (stream) return res;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function generateSearchQueries(question, subjectTags) {
  const subjectHint = subjectTags?.length ? ` The topic is: ${subjectTags.join(', ')}.` : '';
  const prompt = `You are a search query generator for a GATE CSE tutor. Given a user's question, generate 1-3 concise search queries that would find the most relevant and up-to-date information to answer it.${subjectHint} Return only the queries, one per line, without numbering or extra text.`;

  try {
    const result = await callCerebras(
      [{ role: 'system', content: prompt }, { role: 'user', content: question }],
      { model: 'gpt-oss-120b', maxTokens: 256, temperature: 0.3 }
    );
    const queries = result.split('\n').map(q => q.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean);
    return queries.length > 0 ? queries.slice(0, 3) : [question];
  } catch (err) {
    console.error('Query generation failed:', err?.message);
    return [question];
  }
}

function buildSearchContext(searchResults, fetchedContents) {
  let context = '\n\n--- WEB SEARCH RESULTS ---\n\n';
  const contentMap = {};
  for (const fc of fetchedContents) {
    if (fc.content) contentMap[fc.url] = fc;
  }

  let idx = 0;
  for (const r of searchResults) {
    idx++;
    context += `[${idx}] ${r.title}\nURL: ${r.url}\nSummary: ${r.snippet}\n`;
    const fc = contentMap[r.url];
    if (fc && fc.content) {
      const excerpt = fc.content.slice(0, 1500);
      context += `Content: ${excerpt}\n\n`;
    } else {
      context += '\n';
    }
  }

  context += `--- END OF WEB SEARCH RESULTS ---\n\n`;
  context += `Use the above web search results to answer the user's question. When referencing information from a source, cite it as [1], [2], etc. based on the numbered list above. If the search results don't contain relevant information, state that and use your own knowledge.`;
  return { context, sources: searchResults.map((r, i) => ({ title: r.title, url: r.url, snippet: r.snippet, index: i + 1 })) };
}

function writeSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const WEB_SEARCH_ADDON = `When answering using web search results:
1. Prioritize information from the web search results over your training data when they conflict.
2. Cite sources using numbered brackets like [1], [2] corresponding to the source list.
3. If the search results lack certain information, clearly state what you found and what you're inferring.
4. Keep answers well-structured even when drawing from multiple sources.`;

function buildMessages(systemPrompt, searchContext, messages, imageParts, hasSearchResults) {
  const combinedSystem = hasSearchResults
    ? `${systemPrompt}\n\n${searchContext}\n\n${WEB_SEARCH_ADDON}`
    : systemPrompt;

  const result = [{ role: 'system', content: combinedSystem }];
  for (const m of messages) {
    if (m.role === 'assistant') {
      result.push({ role: 'assistant', content: m.text });
    } else if (m.role === 'system') {
      continue;
    } else {
      const isLast = m === messages[messages.length - 1];
      if (imageParts?.length && isLast) {
        const contentParts = [{ type: 'text', text: m.text }];
        for (const img of imageParts) {
          contentParts.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } });
        }
        result.push({ role: 'user', content: contentParts });
      } else {
        result.push({ role: 'user', content: m.text });
      }
    }
  }
  return result;
}

app.post('/api/rag-search', verifyAuth, async (req, res) => {
  const { query, messages, systemPrompt, subjectTags, visualiseMode, imageParts } = req.body;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'Missing query' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    writeSSE(res, { type: 'status', text: 'Generating search queries...' });

    const queries = await generateSearchQueries(query, subjectTags);
    if (aborted) { res.end(); return; }
    writeSSE(res, { type: 'queries', queries });

    writeSSE(res, { type: 'status', text: 'Searching the web...' });

    const searchResults = await multiSearch(queries, 3);
    if (aborted) { res.end(); return; }

    let sources = [];
    let searchContext = null;
    let hasSearchResults = false;

    if (searchResults.length > 0) {
      hasSearchResults = true;
      writeSSE(res, { type: 'status', text: `Reading ${searchResults.length} pages...` });
      const fetchedContents = await fetchAllContent(searchResults);
      if (aborted) { res.end(); return; }

      const built = buildSearchContext(searchResults, fetchedContents);
      searchContext = built.context;
      sources = built.sources;
      writeSSE(res, { type: 'sources', sources });
    } else {
      writeSSE(res, { type: 'status', text: 'No relevant results found. Using existing knowledge.' });
    }

    writeSSE(res, { type: 'status', text: 'Generating answer...' });

    const openAIMessages = buildMessages(systemPrompt, searchContext, messages, imageParts, hasSearchResults);

    const selectedModel = (imageParts && imageParts.length > 0) ? 'gemma-4-31b' : 'gpt-oss-120b';

    const cerebrasRes = await callCerebras(openAIMessages, {
      model: selectedModel,
      stream: true,
      temperature: 0.7,
      maxTokens: visualiseMode ? 32768 : 8192,
    });
    if (aborted) { res.end(); return; }

    const reader = cerebrasRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;
          const text = delta.content || delta.reasoning_content || '';
          if (!text) continue;
          writeSSE(res, { type: 'token', text, thought: !!delta.reasoning_content });
        } catch { }
      }
    }

    writeSSE(res, { type: 'done', sources });
    res.end();
  } catch (err) {
    if (!aborted) {
      writeSSE(res, { type: 'error', text: err?.message || 'RAG search failed' });
      res.end();
    }
  }
});

app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
