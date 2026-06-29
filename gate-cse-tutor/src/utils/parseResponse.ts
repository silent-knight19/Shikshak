export function parseResponse(rawText: string): { textContent: string; visualizationHTML: string | null } {
  if (!rawText || typeof rawText !== 'string') {
    return { textContent: '', visualizationHTML: null };
  }

  try {
    const vizTagRegex = /<visualization>([\s\S]*?)<\/visualization>/gi;
    const matches = [...rawText.matchAll(vizTagRegex)];
    let textContent = rawText.replace(vizTagRegex, '').trim();

    // Strip Mermaid code blocks from text
    textContent = textContent.replace(/```mermaid[\s\S]*?```/gi, '').trim();
    textContent = textContent.replace(/```mmd[\s\S]*?```/gi, '').trim();

    // Collect valid JSON payloads
    const payloads: string[] = [];
    for (const m of matches) {
      const payload = m[1].trim();
      if (payload.startsWith('{') && payload.length > 10) {
        try {
          JSON.parse(payload);
          payloads.push(payload);
        } catch {
          // invalid JSON, skip
        }
      }
    }

    if (payloads.length === 0) {
      return { textContent, visualizationHTML: null };
    }

    // Multiple visualizations: wrap in array
    const combined = payloads.length === 1
      ? payloads[0]
      : `[${payloads.join(',')}]`;

    return { textContent, visualizationHTML: combined };
  } catch (err) {
    console.error('parseResponse error:', err);
    return { textContent: rawText, visualizationHTML: null };
  }
}
