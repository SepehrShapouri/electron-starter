export type SessionDefaultsSnapshot = {
  defaultAgentId?: string;
  mainKey?: string;
  mainSessionKey?: string;
  scope?: string;
};

export type GatewayToolUiState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

export type GatewayChatMessagePart =
  | {
      kind: 'text';
      id: string;
      text: string;
      isStreaming?: boolean;
    }
  | {
      kind: 'reasoning';
      id: string;
      text: string;
      isStreaming?: boolean;
    }
  | {
      kind: 'tool';
      id: string;
      toolName: string;
      toolType: string;
      state: GatewayToolUiState;
      input?: unknown;
      output?: unknown;
      errorText?: string;
      title?: string;
    }
  | {
      kind: 'file';
      id: string;
      filename?: string;
      mime?: string;
      url?: string;
    }
  | {
      kind: 'status';
      id: string;
      label: string;
      tone?: 'default' | 'success' | 'warning' | 'error';
    }
  | {
      kind: 'error';
      id: string;
      message: string;
    };

export type GatewayChatMessage = {
  id: string;
  sessionKey: string;
  role: 'user' | 'assistant';
  status: 'streaming' | 'final' | 'error';
  createdAt: number;
  parts: GatewayChatMessagePart[];
  raw?: unknown;
};

export type GatewayChatRun = {
  id: string;
  sessionKey: string;
  userMessageId: string;
  assistantMessageId: string;
  status: 'queued' | 'streaming' | 'final' | 'aborted' | 'error';
  error?: string;
};

export type GatewayQueueItem = {
  id: string;
  sessionKey: string;
  text: string;
  createdAt: number;
};

export type NormalizedGatewayChatEvent = {
  runId: string;
  sessionKey: string;
  state: 'delta' | 'final' | 'aborted' | 'error';
  message?: GatewayChatMessage;
  messageId?: string;
  messageRole?: 'user' | 'assistant';
  messageCreatedAt?: number;
  part?: GatewayChatMessagePart;
  removedPartId?: string;
  removedMessageId?: string;
  errorMessage?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asRole(value: unknown): 'user' | 'assistant' | null {
  return value === 'assistant' ? 'assistant' : value === 'user' ? 'user' : null;
}

function normalizeToolState(
  value: unknown,
  hasOutput: boolean,
  hasError: boolean
): GatewayToolUiState {
  const normalized = asString(value)?.toLowerCase();

  if (normalized === 'approval-requested') {
    return 'approval-requested';
  }

  if (normalized === 'approval-responded') {
    return 'approval-responded';
  }

  if (normalized === 'output-denied' || normalized === 'denied') {
    return 'output-denied';
  }

  if (normalized === 'output-error' || normalized === 'error' || hasError) {
    return 'output-error';
  }

  if (
    normalized === 'output-available' ||
    normalized === 'completed' ||
    hasOutput
  ) {
    return 'output-available';
  }

  if (normalized === 'input-available' || normalized === 'running') {
    return 'input-available';
  }

  return 'input-streaming';
}

export function stripThinkingTags(text: string): string {
  return text.replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, '').trim();
}

function readCreatedAt(value: Record<string, unknown>): number {
  const createdAt =
    asNumber(value.createdAt) ??
    asNumber(value.created_at) ??
    asNumber(asRecord(value.time)?.created) ??
    Date.now();

  return createdAt;
}

function readMessageId(value: Record<string, unknown>): string | null {
  return (
    asString(value.messageId) ?? asString(value.messageID) ?? asString(value.id)
  );
}

function buildPartId(messageId: string, index: number) {
  return `${messageId}:part:${index}`;
}

function normalizeTextPart(
  messageId: string,
  index: number,
  role: 'user' | 'assistant',
  text: string
): GatewayChatMessagePart | null {
  const normalizedText = role === 'assistant' ? stripThinkingTags(text) : text;
  if (!normalizedText) {
    return null;
  }

  return {
    kind: 'text',
    id: buildPartId(messageId, index),
    text: normalizedText,
  };
}

function normalizePart(
  part: unknown,
  messageId: string,
  index: number,
  role: 'user' | 'assistant'
): GatewayChatMessagePart | null {
  const record = asRecord(part);
  if (!record) {
    return null;
  }

  const partId = asString(record.id) ?? buildPartId(messageId, index);
  const type = asString(record.type)?.toLowerCase();

  if (type === 'text' && typeof record.text === 'string') {
    return normalizeTextPart(messageId, index, role, record.text);
  }

  if (type === 'reasoning' && typeof record.text === 'string') {
    return {
      kind: 'reasoning',
      id: partId,
      text: record.text,
      isStreaming: !asRecord(record.time)?.end,
    };
  }

  const nestedState = asRecord(record.state);
  const toolName =
    asString(record.toolName) ??
    asString(record.tool) ??
    asString(record.name) ??
    asString(nestedState?.tool) ??
    null;

  if (
    type === 'tool' ||
    type === 'tool-call' ||
    type === 'tool_call' ||
    type === 'dynamic-tool' ||
    toolName
  ) {
    const output = record.output ?? nestedState?.output;
    const errorText =
      asString(record.errorText) ??
      asString(record.error) ??
      asString(nestedState?.error);

    return {
      kind: 'tool',
      id: partId,
      toolName: toolName ?? 'tool',
      toolType: type ?? 'tool',
      state: normalizeToolState(
        record.state ?? nestedState?.status,
        Boolean(output),
        Boolean(errorText)
      ),
      input: record.input ?? nestedState?.input,
      output,
      errorText: errorText ?? undefined,
      title:
        asString(record.title) ?? asString(nestedState?.title) ?? undefined,
    };
  }

  if (
    type === 'file' ||
    asString(record.filename) ||
    asString(record.url) ||
    asString(record.mime)
  ) {
    return {
      kind: 'file',
      id: partId,
      filename: asString(record.filename) ?? undefined,
      mime: asString(record.mime) ?? undefined,
      url: asString(record.url) ?? undefined,
    };
  }

  if (type === 'step-start') {
    return {
      kind: 'status',
      id: partId,
      label: 'Step started',
    };
  }

  if (type === 'step-finish') {
    const reason = asString(record.reason);
    return {
      kind: 'status',
      id: partId,
      label: reason ? `Step finished: ${reason}` : 'Step finished',
      tone: 'success',
    };
  }

  if (type === 'patch') {
    return {
      kind: 'status',
      id: partId,
      label: 'Patch generated',
      tone: 'success',
    };
  }

  if (type === 'retry') {
    return {
      kind: 'status',
      id: partId,
      label: `Retry: ${asString(asRecord(record.error)?.name) ?? 'Unknown error'}`,
      tone: 'warning',
    };
  }

  if (type === 'error') {
    return {
      kind: 'error',
      id: partId,
      message: asString(record.message) ?? 'Unknown error',
    };
  }

  if (typeof record.text === 'string') {
    return normalizeTextPart(messageId, index, role, record.text);
  }

  return null;
}

export function normalizeChatMessagePart(
  part: unknown,
  messageId: string,
  role: 'user' | 'assistant',
  index = 0
) {
  return normalizePart(part, messageId, index, role);
}

function normalizeParts(
  messageId: string,
  role: 'user' | 'assistant',
  record: Record<string, unknown>
) {
  const rawParts = Array.isArray(record.parts)
    ? record.parts
    : Array.isArray(record.content)
      ? record.content
      : null;

  const parts = rawParts
    ?.map((part, index) => normalizePart(part, messageId, index, role))
    .filter((part): part is GatewayChatMessagePart => Boolean(part));

  if (parts && parts.length > 0) {
    return parts;
  }

  if (typeof record.content === 'string') {
    const textPart = normalizeTextPart(messageId, 0, role, record.content);
    return textPart ? [textPart] : [];
  }

  if (typeof record.text === 'string') {
    const textPart = normalizeTextPart(messageId, 0, role, record.text);
    return textPart ? [textPart] : [];
  }

  return [];
}

export function normalizeSessionDefaults(
  snapshot: unknown
): SessionDefaultsSnapshot | null {
  const root = asRecord(snapshot);
  if (!root) {
    return null;
  }

  const source = asRecord(root.sessionDefaults) ?? root;

  const defaults: SessionDefaultsSnapshot = {};
  const defaultAgentId = asString(source.defaultAgentId);
  const mainKey = asString(source.mainKey);
  const mainSessionKey = asString(source.mainSessionKey);
  const scope = asString(source.scope);

  if (defaultAgentId) {
    defaults.defaultAgentId = defaultAgentId;
  }

  if (mainKey) {
    defaults.mainKey = mainKey;
  }

  if (mainSessionKey) {
    defaults.mainSessionKey = mainSessionKey;
  }

  if (scope) {
    defaults.scope = scope;
  }

  return Object.keys(defaults).length > 0 ? defaults : null;
}

export function normalizeSessionKeyForDefaults(
  value: string,
  defaults?: SessionDefaultsSnapshot | null
) {
  const raw = value.trim();
  const mainSessionKey = defaults?.mainSessionKey?.trim();
  if (!mainSessionKey) {
    return raw;
  }

  if (!raw) {
    return mainSessionKey;
  }

  const mainKey = defaults?.mainKey?.trim() || 'main';
  const defaultAgentId = defaults?.defaultAgentId?.trim();
  const isAlias =
    raw === 'main' ||
    raw === mainKey ||
    (defaultAgentId &&
      (raw === `agent:${defaultAgentId}:main` ||
        raw === `agent:${defaultAgentId}:${mainKey}`));

  return isAlias ? mainSessionKey : raw;
}

export function normalizeChatMessage(
  message: unknown,
  fallbackSessionKey: string
): GatewayChatMessage | null {
  const record = asRecord(message);
  if (!record) {
    return null;
  }

  const roleValue =
    record.role === 'assistant'
      ? 'assistant'
      : record.role === 'user'
        ? 'user'
        : null;

  if (!roleValue) {
    return null;
  }

  const messageId =
    asString(record.id) ??
    `${roleValue}:${readCreatedAt(record)}:${Math.random().toString(36).slice(2, 8)}`;
  const sessionKey = asString(record.sessionKey) ?? fallbackSessionKey;
  const parts = normalizeParts(messageId, roleValue, record);

  return {
    id: messageId,
    sessionKey,
    role: roleValue,
    status: 'final',
    createdAt: readCreatedAt(record),
    parts,
    raw: message,
  };
}

export function normalizeChatEventPayload(
  event: string,
  payload: unknown,
  fallbackSessionKey: string
): NormalizedGatewayChatEvent | null {
  if (event === 'chat') {
    const record = asRecord(payload);
    if (!record) {
      return null;
    }

    const runId = asString(record.runId);
    const sessionKey = asString(record.sessionKey) ?? fallbackSessionKey;
    const state =
      record.state === 'delta' ||
      record.state === 'final' ||
      record.state === 'aborted' ||
      record.state === 'error'
        ? record.state
        : null;

    if (!runId || !state) {
      return null;
    }

    const message = normalizeChatMessage(record.message, sessionKey);
    if (message) {
      message.status =
        state === 'delta' ? 'streaming' : state === 'error' ? 'error' : 'final';
    }

    return {
      runId,
      sessionKey,
      state,
      message: message ?? undefined,
      errorMessage: asString(record.errorMessage) ?? undefined,
    };
  }

  const structured = asRecord(payload);
  if (!structured) {
    return null;
  }

  if (
    event === 'chat.run.completed' ||
    event === 'chat.run.errored' ||
    event === 'chat.run.aborted'
  ) {
    const runId = asString(structured.runId);
    const sessionKey = asString(structured.sessionKey) ?? fallbackSessionKey;

    if (!runId) {
      return null;
    }

    return {
      runId,
      sessionKey,
      state:
        event === 'chat.run.completed'
          ? 'final'
          : event === 'chat.run.aborted'
            ? 'aborted'
            : 'error',
      message:
        normalizeChatMessage(structured.message, sessionKey) ?? undefined,
      errorMessage: asString(structured.errorMessage) ?? undefined,
    };
  }

  if (event === 'chat.run.updated') {
    const runId = asString(structured.runId);
    const sessionKey = asString(structured.sessionKey) ?? fallbackSessionKey;
    const stateValue = asString(structured.state)?.toLowerCase();

    if (!runId) {
      return null;
    }

    return {
      runId,
      sessionKey,
      state:
        stateValue === 'completed' || stateValue === 'final'
          ? 'final'
          : stateValue === 'aborted'
            ? 'aborted'
            : stateValue === 'error' || stateValue === 'errored'
              ? 'error'
              : 'delta',
      message:
        normalizeChatMessage(structured.message, sessionKey) ?? undefined,
      errorMessage: asString(structured.errorMessage) ?? undefined,
    };
  }

  if (event === 'chat.message.updated') {
    const runId = asString(structured.runId);
    const sessionKey = asString(structured.sessionKey) ?? fallbackSessionKey;
    if (!runId) {
      return null;
    }

    const message = normalizeChatMessage(
      structured.message ?? structured,
      sessionKey
    );

    return {
      runId,
      sessionKey,
      state: 'delta',
      message: message
        ? {
            ...message,
            status: 'streaming',
          }
        : undefined,
    };
  }

  if (event === 'chat.message.part.updated') {
    const runId = asString(structured.runId);
    const sessionKey = asString(structured.sessionKey) ?? fallbackSessionKey;
    const partRecord = asRecord(structured.part);
    const messageId =
      asString(structured.messageId) ??
      asString(structured.messageID) ??
      (partRecord ? readMessageId(partRecord) : null);
    const messageRole =
      asRole(structured.role) ??
      asRole(structured.messageRole) ??
      (partRecord ? asRole(partRecord.role) : null) ??
      'assistant';

    if (!runId || !messageId) {
      return null;
    }

    const message = normalizeChatMessage(structured.message, sessionKey);
    if (message) {
      return {
        runId,
        sessionKey,
        state: 'delta',
        messageId: message.id,
        messageRole: message.role,
        messageCreatedAt: message.createdAt,
        message: {
          ...message,
          status: 'streaming',
        },
      };
    }

    const part = normalizeChatMessagePart(
      structured.part,
      messageId,
      messageRole
    );

    if (!part) {
      return null;
    }

    return {
      runId,
      sessionKey,
      state: 'delta',
      messageId,
      messageRole,
      messageCreatedAt: partRecord ? readCreatedAt(partRecord) : Date.now(),
      part,
    };
  }

  if (event === 'chat.message.part.removed') {
    const runId = asString(structured.runId);
    const sessionKey = asString(structured.sessionKey) ?? fallbackSessionKey;
    const messageId =
      asString(structured.messageId) ?? asString(structured.messageID);
    const removedPartId =
      asString(structured.partId) ?? asString(structured.partID);

    if (!runId || !messageId || !removedPartId) {
      return null;
    }

    return {
      runId,
      sessionKey,
      state: 'delta',
      messageId,
      removedPartId,
    };
  }

  if (event === 'chat.message.removed') {
    const runId = asString(structured.runId);
    const sessionKey = asString(structured.sessionKey) ?? fallbackSessionKey;
    const removedMessageId =
      asString(structured.messageId) ?? asString(structured.messageID);

    if (!runId || !removedMessageId) {
      return null;
    }

    return {
      runId,
      sessionKey,
      state: 'delta',
      removedMessageId,
    };
  }

  return null;
}

export function getMessageText(message: GatewayChatMessage) {
  return message.parts
    .filter(
      (part): part is Extract<GatewayChatMessagePart, { kind: 'text' }> =>
        part.kind === 'text'
    )
    .map(part => part.text)
    .join('\n')
    .trim();
}
