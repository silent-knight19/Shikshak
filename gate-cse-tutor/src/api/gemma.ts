import type { StreamChunk, Attachment } from '../store/types';
import { extractJsonObjects, parseResponseObject } from '../utils/stream-parser';
import { auth } from '../firebase/config';

async function getIdToken(): Promise<string | null> {
  try {
    return await auth.currentUser?.getIdToken() ?? null;
  } catch { return null; }
}

export async function* streamGemmaResponse(
  messages: { role: string; text: string; attachments?: Attachment[] }[],
  systemInstruction: string,
  signal?: AbortSignal,
  visualiseMode = false,
  imageParts?: { mimeType: string; data: string }[],
): AsyncGenerator<StreamChunk> {
  const contents = messages.map((m, idx) => {
    const parts: any[] = [];

    if (idx === messages.length - 1 && m.role === 'user' && imageParts?.length) {
      for (const img of imageParts) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
    }

    parts.push({ text: m.text });
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

  const body = {
    model: 'gemma-4-31b-it',
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: visualiseMode ? 32768 : 8192,
      thinkingConfig: { thinkingLevel: 'high' },
    },
  };

  const token = await getIdToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let errorText = `API error ${response.status}`;
    try {
      const err = await response.json();
      errorText = err.error?.message || err.error || errorText;
    } catch { /* ignore */ }
    yield { text: errorText, thought: false, done: true, error: errorText };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { text: 'No response stream available', thought: false, done: true, error: 'No stream' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Extract complete JSON objects from the streamed JSON array
      const { objects, remaining } = extractJsonObjects(buffer);
      buffer = remaining;

      for (const obj of objects) {
        const chunk = parseResponseObject(obj);
        if (chunk) yield chunk;
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const { objects } = extractJsonObjects(buffer);
      for (const obj of objects) {
        const chunk = parseResponseObject(obj);
        if (chunk) yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
