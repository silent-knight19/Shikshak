import type { StreamChunk } from '../store/types';

/**
 * Parse a single SSE event object into a StreamChunk.
 * Handles OpenAI-compatible chunk format.
 */
export function parseSSEEvent(obj: any): StreamChunk | null {
  try {
    const choice = obj.choices?.[0];
    
    if (!choice) {
      // Might be a usage-only final chunk
      const um = obj.usage;
      if (um) {
        return {
          text: '',
          thought: false,
          done: false,
          tokenUsage: {
            prompt: um.prompt_tokens ?? 0,
            completion: um.completion_tokens ?? 0,
            thinking: 0,
          },
        };
      }
      return null;
    }

    const delta = choice.delta;
    let text = delta?.content || '';
    let thought = false;

    // Support deepseek-reasoner style reasoning content if present
    if (delta?.reasoning_content) {
      text = delta.reasoning_content;
      thought = true;
    }

    const um = obj.usage;
    const tokenUsage = um
      ? {
          prompt: um.prompt_tokens ?? 0,
          completion: um.completion_tokens ?? 0,
          thinking: 0,
        }
      : undefined;

    return { text, thought, done: false, tokenUsage };
  } catch {
    return null;
  }
}

/**
 * Extract SSE events from the buffer.
 * Expected format: data: {...}\n\n
 */
export function extractSSEEvents(buffer: string): { events: any[]; remaining: string } {
  const events: any[] = [];
  let remaining = buffer;

  while (true) {
    const doubleNewlineIdx = remaining.indexOf('\n\n');
    if (doubleNewlineIdx === -1) {
      // Also check for \r\n\r\n just in case
      const doubleCrLfIdx = remaining.indexOf('\r\n\r\n');
      if (doubleCrLfIdx === -1) {
        break;
      }
      const chunk = remaining.slice(0, doubleCrLfIdx);
      remaining = remaining.slice(doubleCrLfIdx + 4);
      processChunk(chunk, events);
    } else {
      const chunk = remaining.slice(0, doubleNewlineIdx);
      remaining = remaining.slice(doubleNewlineIdx + 2);
      processChunk(chunk, events);
    }
  }

  return { events, remaining };
}

function processChunk(chunk: string, events: any[]) {
  const lines = chunk.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        events.push('[DONE]');
      } else if (data) {
        try {
          events.push(JSON.parse(data));
        } catch {
          // malformed or incomplete data, ignore
        }
      }
    }
  }
}
