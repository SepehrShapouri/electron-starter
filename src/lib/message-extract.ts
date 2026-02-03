export function stripThinkingTags(text: string): string {
  return text.replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, '').trim();
}

export function extractText(message: unknown): string | null {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === 'string' ? m.role : '';
  const content = m.content;

  if (typeof content === 'string') {
    return role === 'assistant' ? stripThinkingTags(content) : content;
  }

  if (Array.isArray(content)) {
    const parts = content
      .map(item => {
        const part = item as Record<string, unknown>;
        return part.type === 'text' && typeof part.text === 'string'
          ? part.text
          : null;
      })
      .filter((value): value is string => typeof value === 'string');

    if (parts.length > 0) {
      const joined = parts.join('\n');
      return role === 'assistant' ? stripThinkingTags(joined) : joined;
    }
  }

  if (typeof m.text === 'string') {
    return role === 'assistant' ? stripThinkingTags(m.text) : m.text;
  }

  return null;
}
