import { useState, useRef, useCallback } from 'react';
import type { SubjectTag, Attachment, Source } from '../store/types';
import { streamCerebrasResponse } from '../api/cerebras';
import { buildSystemInstruction } from '../api/prompts';
import { auth } from '../firebase/config';

export function useStreaming() {
  const [streaming, setStreaming] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [thinkingText, setThinkingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{ prompt: number; completion: number; thinking: number } | undefined>();
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);
  const aborterRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (
    messages: { role: string; text: string; attachments?: Attachment[] }[],
    subjectTags: SubjectTag[],
    visualiseMode = false,
    imageParts?: { mimeType: string; data: string }[],
    webSearch = false,
    onChunk?: (fullAnswer: string, fullThinking: string, usage?: { prompt: number; completion: number; thinking: number }) => void,
  ) => {
    aborterRef.current?.abort();
    aborterRef.current = new AbortController();

    setStreaming(true);
    setAnswerText('');
    setThinkingText('');
    setError(null);
    setTokenUsage(undefined);
    setSearchStatus('');
    setSources([]);

    let thinkingAccum = '';
    let answerAccum = '';
    let lastUsage: typeof tokenUsage;
    let resultSources: Source[] = [];

    try {
      if (webSearch) {
        const token = await auth.currentUser?.getIdToken();
        const userQuery = messages[messages.length - 1]?.text || '';
        const searchMessages = messages.map(m => ({ role: m.role, text: m.text }));

        setSearchStatus('Checking if web search is needed...');

        const systemPrompt = buildSystemInstruction(subjectTags, visualiseMode);

        const response = await fetch('/api/rag-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            query: userQuery,
            messages: searchMessages,
            systemPrompt,
            subjectTags: subjectTags.map(s => s),
            visualiseMode,
            imageParts,
          }),
          signal: aborterRef.current.signal,
        });

        if (!response.ok) {
          const errText = `RAG search error ${response.status}`;
          setError(errText);
          setStreaming(false);
          return { answer: '', thinking: '', tokenUsage: undefined, sources: [] };
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setError('No response stream');
          setStreaming(false);
          return { answer: '', thinking: '', tokenUsage: undefined, sources: [] };
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let finalSources: Source[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload) continue;

            try {
              const event = JSON.parse(payload);
              switch (event.type) {
                case 'status':
                  setSearchStatus(event.text || '');
                  break;
                case 'queries':
                  break;
                case 'sources':
                  finalSources = event.sources || [];
                  setSources(finalSources);
                  break;
                case 'token':
                  if (event.thought) {
                    thinkingAccum += event.text || '';
                    setThinkingText(thinkingAccum);
                  } else {
                    answerAccum += event.text || '';
                    setAnswerText(answerAccum);
                  }
                  onChunk?.(answerAccum, thinkingAccum, lastUsage);
                  break;
                case 'done':
                  finalSources = event.sources || finalSources;
                  setSources(finalSources);
                  setSearchStatus('');
                  setStreaming(false);
                  return { answer: answerAccum, thinking: thinkingAccum, tokenUsage: undefined, sources: finalSources };
                case 'error':
                  setError(event.text || 'Search failed');
                  setSearchStatus('');
                  setStreaming(false);
                  return { answer: answerAccum, thinking: thinkingAccum, tokenUsage: undefined, sources: finalSources };
              }
            } catch { }
          }
        }

        setSearchStatus('');
        setStreaming(false);
        return { answer: answerAccum, thinking: thinkingAccum, tokenUsage: undefined, sources: finalSources };
      } else {
        const systemPrompt = buildSystemInstruction(subjectTags, visualiseMode);

        for await (const chunk of streamCerebrasResponse(
          messages,
          systemPrompt,
          aborterRef.current.signal,
          visualiseMode,
          imageParts,
          webSearch,
        )) {
          if (chunk.error) {
            setError(chunk.error);
            break;
          }
          if (chunk.done) {
            if (chunk.tokenUsage) lastUsage = chunk.tokenUsage;
            break;
          }

          if (chunk.thought) {
            thinkingAccum += chunk.text;
            setThinkingText(thinkingAccum);
          } else {
            answerAccum += chunk.text;
            setAnswerText(answerAccum);
          }

          if (chunk.tokenUsage) {
            lastUsage = chunk.tokenUsage;
            setTokenUsage(lastUsage);
          }

          onChunk?.(answerAccum, thinkingAccum, lastUsage);
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message || 'Stream error');
      }
    } finally {
      setStreaming(false);
      if (lastUsage) setTokenUsage(lastUsage);
    }

    return { answer: answerAccum, thinking: thinkingAccum, tokenUsage: lastUsage, sources: resultSources };
  }, []);

  const stopStream = useCallback(() => {
    aborterRef.current?.abort();
    setStreaming(false);
  }, []);

  return { streaming, answerText, thinkingText, error, tokenUsage, searchStatus, sources, startStream, stopStream };
}
