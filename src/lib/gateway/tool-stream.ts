export type GatewayToolStreamState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

export type GatewayToolStreamEntry = {
  toolCallId: string;
  runId: string;
  sessionKey: string;
  assistantMessageId?: string;
  toolName: string;
  state: GatewayToolStreamState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  startedAt: number;
  updatedAt: number;
  raw?: unknown;
};

export type NormalizedGatewayToolEvent = {
  runId: string;
  sessionKey: string;
  toolCallId: string;
  toolName: string;
  phase: 'start' | 'update' | 'result';
  state: GatewayToolStreamState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  ts: number;
  raw?: unknown;
};

const TOOL_OUTPUT_CHAR_LIMIT = 120_000;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function truncateText(value: string) {
  if (value.length <= TOOL_OUTPUT_CHAR_LIMIT) {
    return value;
  }

  return `${value.slice(0, TOOL_OUTPUT_CHAR_LIMIT)}\n\n… truncated (${value.length} chars, showing first ${TOOL_OUTPUT_CHAR_LIMIT}).`;
}

function extractToolOutputText(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') {
    return record.text;
  }

  const content = record.content;
  if (!Array.isArray(content)) {
    return null;
  }

  const parts = content
    .map(item => {
      const entry = asRecord(item);
      if (!entry) {
        return null;
      }

      return entry.type === 'text' && typeof entry.text === 'string'
        ? entry.text
        : null;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join('\n') : null;
}

function normalizeToolOutput(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return truncateText(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  const text = extractToolOutputText(value);
  if (text) {
    return truncateText(text);
  }

  return value;
}

function extractToolErrorText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return (
    asString(record.errorText) ??
    asString(record.error_text) ??
    asString(record.error) ??
    asString(record.message) ??
    asString(asRecord(record.result)?.error) ??
    undefined
  );
}

export function normalizeGatewayToolEventPayload(
  event: string,
  payload: unknown
): NormalizedGatewayToolEvent | null {
  if (event !== 'agent') {
    return null;
  }

  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const stream = asString(record.stream);
  if (stream !== 'tool') {
    return null;
  }

  const runId = asString(record.runId);
  const sessionKey = asString(record.sessionKey);
  const ts = asNumber(record.ts) ?? Date.now();
  const data = asRecord(record.data) ?? {};
  const phase = asString(data.phase);
  const toolCallId = asString(data.toolCallId);
  const toolName = asString(data.name) ?? 'tool';

  if (
    !runId ||
    !sessionKey ||
    !toolCallId ||
    (phase !== 'start' && phase !== 'update' && phase !== 'result')
  ) {
    return null;
  }

  if (phase === 'start') {
    return {
      runId,
      sessionKey,
      toolCallId,
      toolName,
      phase,
      state: 'input-available',
      input: data.args,
      ts,
      raw: payload,
    };
  }

  if (phase === 'update') {
    return {
      runId,
      sessionKey,
      toolCallId,
      toolName,
      phase,
      state: 'input-available',
      output: normalizeToolOutput(data.partialResult),
      ts,
      raw: payload,
    };
  }

  const isError = data.isError === true;
  const normalizedOutput = normalizeToolOutput(data.result);
  const errorText = isError ? extractToolErrorText(data.result) : undefined;

  return {
    runId,
    sessionKey,
    toolCallId,
    toolName,
    phase,
    state: isError ? 'output-error' : 'output-available',
    output: normalizedOutput,
    errorText,
    ts,
    raw: payload,
  };
}
