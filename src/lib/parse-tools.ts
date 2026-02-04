import type { ToolUIPart } from 'ai';

export type ToolInvocation = {
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  state: ToolUIPart['state'];
};

/**
 * Parse tool invocations from message content
 * Handles both the raw message structure and tool events
 */
export function parseToolInvocations(message: unknown): ToolInvocation[] {
  const m = message as Record<string, unknown>;
  const content = m.content;
  
  console.log('🔍 parseToolInvocations called with:', { message, content });
  
  // Check if content is an array with tool_use blocks (Anthropic format)
  if (Array.isArray(content)) {
    console.log('✅ Content is array, processing...');
    console.log('📋 Content blocks:', content);
    const toolInvocations: ToolInvocation[] = [];
    
    for (const block of content) {
      const b = block as Record<string, unknown>;
      console.log('🔎 Block:', b, 'type:', b.type);
      
      // Handle toolCall blocks (gateway format)
      if (b.type === 'toolCall') {
        console.log('🔧 Found toolCall block!');
        toolInvocations.push({
          name: String(b.name ?? 'unknown'),
          input: (b.arguments as Record<string, unknown>) ?? {},
          state: 'input-available',
        });
      }
      
      // Handle tool_use blocks (Anthropic format)
      if (b.type === 'tool_use') {
        console.log('🔧 Found tool_use block!');
        toolInvocations.push({
          name: String(b.name ?? 'unknown'),
          input: (b.input as Record<string, unknown>) ?? {},
          state: 'input-available',
        });
      }
      
      // Handle toolResult blocks (gateway format)
      if (b.type === 'toolResult') {
        console.log('🎯 Found toolResult block!', b);
        const toolCallId = String(b.toolCallId ?? '');
        const isError = b.isError === true;
        const result = b.result;
        
        // Find matching toolCall by toolCallId
        const existing = toolInvocations.find(
          (t) => {
            // Try to match by ID from the original toolCall
            const toolCall = content.find((c: any) => c.type === 'toolCall' && c.id === toolCallId);
            return toolCall && t.name === String(toolCall.name);
          }
        );
        
        console.log('🔍 Matched existing tool:', existing);
        
        if (existing) {
          existing.output = result;
          existing.state = isError ? 'output-error' : 'output-available';
          if (isError && typeof result === 'string') {
            existing.error = result;
          }
        } else {
          console.log('⚠️ No matching toolCall found for toolResult:', toolCallId);
        }
      }
      
      // Handle tool_result blocks (Anthropic format)
      if (b.type === 'tool_result') {
        const toolUseId = String(b.tool_use_id ?? '');
        const isError = b.is_error === true;
        const content = b.content;
        
        // Find matching tool_use to get the name and input
        const toolUse = (content as Array<Record<string, unknown>>)?.find(
          (item) => item.type === 'tool_use' && item.id === toolUseId
        );
        
        const existing = toolInvocations.find(
          (t) => t.name === String(toolUse?.name ?? 'unknown')
        );
        
        if (existing) {
          existing.output = content;
          existing.state = isError ? 'output-error' : 'output-available';
          if (isError && typeof content === 'string') {
            existing.error = content;
          }
        } else {
          toolInvocations.push({
            name: String(toolUse?.name ?? 'unknown'),
            input: (toolUse?.input as Record<string, unknown>) ?? {},
            output: content,
            state: isError ? 'output-error' : 'output-available',
            error: isError && typeof content === 'string' ? content : undefined,
          });
        }
      }
    }
    
    console.log('📊 Returning tool invocations:', toolInvocations);
    return toolInvocations;
  }
  
  console.log('⚠️ Content not an array, returning empty');
  return [];
}

/**
 * Convert tool invocations to ToolUIPart format for the Tool component
 */
export function toToolUIParts(
  invocations: ToolInvocation[],
  messageId: string
): Array<ToolUIPart> {
  return invocations.map((inv, idx) => {
    const basePart = {
      type: `tool-${inv.name}` as ToolUIPart['type'],
      toolCallId: `${messageId}-tool-${idx}`,
      input: inv.input,
      state: inv.state,
    };

    // Build the part according to the state
    if (inv.state === 'output-error') {
      return {
        ...basePart,
        output: inv.output,
        errorText: inv.error,
      } as ToolUIPart;
    }

    if (inv.state === 'output-available') {
      return {
        ...basePart,
        output: inv.output,
      } as ToolUIPart;
    }

    // For other states (input-streaming, input-available, etc.)
    return basePart as ToolUIPart;
  });
}
