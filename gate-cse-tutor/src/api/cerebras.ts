import type { StreamChunk, Attachment } from '../store/types';
import { extractSSEEvents, parseSSEEvent } from '../utils/stream-parser';
import { auth } from '../firebase/config';

async function getIdToken(): Promise<string | null> {
  try {
    return await auth.currentUser?.getIdToken() ?? null;
  } catch { return null; }
}

export async function* streamCerebrasResponse(
  messages: { role: string; text: string; attachments?: Attachment[] }[],
  systemInstruction: string,
  signal?: AbortSignal,
  visualiseMode = false,
  imageParts?: { mimeType: string; data: string }[],
  _webSearch = false,
): AsyncGenerator<StreamChunk> {
  const openAIMessages: any[] = [
    { role: 'system', content: systemInstruction }
  ];

  for (let idx = 0; idx < messages.length; idx++) {
    const m = messages[idx];
    const role = m.role === 'assistant' ? 'assistant' : 'user';

    if (idx === messages.length - 1 && role === 'user' && imageParts?.length) {
      const contentParts: any[] = [{ type: 'text', text: m.text }];
      for (const img of imageParts) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` }
        });
      }
      openAIMessages.push({ role, content: contentParts });
    } else {
      openAIMessages.push({ role, content: m.text });
    }
  }

  const modelName = (imageParts && imageParts.length > 0) ? 'gemma-4-31b' : 'gpt-oss-120b';

  const body: any = {
    model: modelName,
    messages: openAIMessages,
    stream: true,
    temperature: 0.7,
    max_completion_tokens: visualiseMode ? 32768 : 8192,
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

      const { events, remaining } = extractSSEEvents(buffer);
      buffer = remaining;

      for (const event of events) {
        if (event === '[DONE]') {
          yield { text: '', thought: false, done: true };
          break;
        }
        const chunk = parseSSEEvent(event);
        if (chunk) yield chunk;
      }
    }

    if (buffer.trim()) {
      const { events } = extractSSEEvents(buffer);
      for (const event of events) {
        if (event === '[DONE]') continue;
        const chunk = parseSSEEvent(event);
        if (chunk) yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
