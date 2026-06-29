import { useState, useRef, useCallback } from 'react';
import type { SubjectTag, Attachment } from '../store/types';
import { streamGemmaResponse } from '../api/gemma';
import { buildSystemInstruction } from '../api/prompts';

export function useStreaming() {
  const [streaming, setStreaming] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [thinkingText, setThinkingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{ prompt: number; completion: number; thinking: number } | undefined>();
  const aborterRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (
    messages: { role: string; text: string; attachments?: Attachment[] }[],
    subjectTags: SubjectTag[],
    visualiseMode = false,
    imageParts?: { mimeType: string; data: string }[],
    onChunk?: (fullAnswer: string, fullThinking: string, usage?: { prompt: number; completion: number; thinking: number }) => void,
  ) => {
    aborterRef.current?.abort();
    aborterRef.current = new AbortController();

    setStreaming(true);
    setAnswerText('');
    setThinkingText('');
    setError(null);
    setTokenUsage(undefined);

    let thinkingAccum = '';
    let answerAccum = '';
    let lastUsage: typeof tokenUsage;

    try {
      const systemPrompt = buildSystemInstruction(subjectTags, visualiseMode);

      for await (const chunk of streamGemmaResponse(
        messages,
        systemPrompt,
        aborterRef.current.signal,
        visualiseMode,
        imageParts,
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
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message || 'Stream error');
      }
    } finally {
      setStreaming(false);
      if (lastUsage) setTokenUsage(lastUsage);
    }

    return { answer: answerAccum, thinking: thinkingAccum, tokenUsage: lastUsage };
  }, []);

  const stopStream = useCallback(() => {
    aborterRef.current?.abort();
    setStreaming(false);
  }, []);

  return { streaming, answerText, thinkingText, error, tokenUsage, startStream, stopStream };
}
