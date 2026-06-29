import type { StreamChunk } from '../store/types';

/**
 * Parse a single Gemini API response object into a StreamChunk.
 * The streamGenerateContent endpoint returns a JSON array of response objects,
 * NOT SSE "data:" lines. Each object has the standard Gemini response shape.
 */
export function parseResponseObject(obj: any): StreamChunk | null {
  try {
    const candidate = obj.candidates?.[0];
    if (!candidate?.content?.parts) {
      // Might be a usage-only final chunk
      const um = obj.usageMetadata;
      if (um) {
        return {
          text: '',
          thought: false,
          done: false,
          tokenUsage: {
            prompt: um.promptTokenCount ?? 0,
            completion: um.candidatesTokenCount ?? 0,
            thinking: um.thoughtsTokenCount ?? 0,
          },
        };
      }
      return null;
    }

    let text = '';
    let thought = false;

    for (const part of candidate.content.parts) {
      if (part.text != null) {
        text += part.text;
        if (part.thought) thought = true;
      }
    }

    const um = obj.usageMetadata;
    const tokenUsage = um
      ? {
          prompt: um.promptTokenCount ?? 0,
          completion: um.candidatesTokenCount ?? 0,
          thinking: um.thoughtsTokenCount ?? 0,
        }
      : undefined;

    return { text, thought, done: false, tokenUsage };
  } catch {
    return null;
  }
}

/**
 * Incrementally extract complete JSON objects from a streamed JSON array.
 *
 * The Gemini streamGenerateContent response looks like:
 *   [{...}\n,{...}\n,{...}\n]
 *
 * We track bracket depth to find where each top-level object ends,
 * then parse it. Returns the parsed objects and any remaining buffer.
 */
export function extractJsonObjects(buffer: string): { objects: any[]; remaining: string } {
  const objects: any[] = [];
  let i = 0;

  while (i < buffer.length) {
    // Skip whitespace, commas, and array brackets at the top level
    const ch = buffer[i];
    if (ch === '[' || ch === ']' || ch === ',' || ch === '\n' || ch === '\r' || ch === ' ' || ch === '\t') {
      i++;
      continue;
    }

    // We expect a '{' to start an object
    if (ch !== '{') {
      i++;
      continue;
    }

    // Find the matching closing '}'
    let depth = 0;
    let inString = false;
    let escape = false;
    let j = i;

    for (; j < buffer.length; j++) {
      const c = buffer[j];

      if (escape) {
        escape = false;
        continue;
      }

      if (c === '\\' && inString) {
        escape = true;
        continue;
      }

      if (c === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          // Found a complete object
          const jsonStr = buffer.slice(i, j + 1);
          try {
            objects.push(JSON.parse(jsonStr));
          } catch {
            // Malformed JSON — skip it
          }
          i = j + 1;
          break;
        }
      }
    }

    // If we didn't close the object, the rest is an incomplete fragment
    if (depth > 0) {
      return { objects, remaining: buffer.slice(i) };
    }
  }

  return { objects, remaining: '' };
}
