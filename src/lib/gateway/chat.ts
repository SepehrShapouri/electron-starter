export type SessionDefaultsSnapshot = {
  defaultAgentId?: string;
  mainKey?: string;
  mainSessionKey?: string;
  scope?: string;
};

export type GatewayChatRole = 'user' | 'assistant' | 'toolResult';
export type GatewayChatMessageStatus =
  | 'streaming'
  | 'final'
  | 'error'
  | 'aborted';

type GatewayChatMessagePartBase = {
  id: string;
  type?: string;
  raw: unknown;
  isStreaming?: boolean;
};

export type GatewayChatTextPart = GatewayChatMessagePartBase & {
  kind: 'text';
  text: string;
};

export type GatewayChatErrorPart = GatewayChatMessagePartBase & {
  kind: 'error';
  message: string;
};

export type GatewayChatToolPart = GatewayChatMessagePartBase & {
  kind: 'tool';
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export type GatewayChatUnknownPart = GatewayChatMessagePartBase & {
  kind: 'unknown';
};

export type GatewayChatMessagePart =
  | GatewayChatTextPart
  | GatewayChatErrorPart
  | GatewayChatToolPart
  | GatewayChatUnknownPart;

export type GatewayVisibleChatMessagePart =
  | GatewayChatTextPart
  | GatewayChatErrorPart;

export type GatewayChatMessage = {
  id: string;
  sessionKey: string;
  role: GatewayChatRole;
  status: GatewayChatMessageStatus;
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
  messageRole?: GatewayChatRole;
  messageCreatedAt?: number;
  part?: GatewayChatMessagePart;
  removedPartId?: string;
  removedMessageId?: string;
  errorMessage?: string;
};

type NormalizeChatMessageOptions = {
  fallbackMessageId?: string;
  fallbackCreatedAt?: number;
  fallbackRole?: GatewayChatRole;
};

const TOOL_CALL_TYPES = new Set([
  'tool_call',
  'toolcall',
  'tool-call',
  'tool_use',
  'tooluse',
  'tool-use',
]);
const TOOL_RESULT_TYPES = new Set([
  'tool_result',
  'toolresult',
  'tool-result',
]);
const TOOL_PART_TYPES = new Set([
  ...TOOL_CALL_TYPES,
  ...TOOL_RESULT_TYPES,
  'tool',
  'dynamic-tool',
  'function',
  'function_call',
  'function-call',
]);

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

function asRole(value: unknown): GatewayChatRole | null {
  if (value === 'assistant') {
    return 'assistant';
  }

  if (value === 'user') {
    return 'user';
  }

  return value === 'toolResult' ||
    value === 'tool_result' ||
    value === 'tool'
    ? 'toolResult'
    : null;
}

function readFirstString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function buildPartId(messageId: string, index: number) {
  return `${messageId}:part:${index}`;
}

export function stripThinkingTags(text: string): string {
  return text.replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, '').trim();
}

function readCreatedAt(
  value: Record<string, unknown>,
  fallback = Date.now()
): number {
  const createdAt =
    asNumber(value.createdAt) ??
    asNumber(value.created_at) ??
    asNumber(asRecord(value.time)?.created) ??
    fallback;

  return createdAt;
}

function readMessageId(value: Record<string, unknown>): string | null {
  return readFirstString(value, ['messageId', 'messageID', 'message_id', 'id']);
}

function readPartId(
  value: Record<string, unknown>,
  messageId: string,
  index: number
) {
  return readFirstString(value, ['partId', 'partID', 'part_id', 'id']) ?? buildPartId(messageId, index);
}

function isToolLikePart(
  record: Record<string, unknown>,
  type?: string
): boolean {
  if (type && TOOL_PART_TYPES.has(type)) {
    return true;
  }

  return (
    readFirstString(record, ['toolName', 'tool_name', 'tool']) !== null ||
    'toolCallId' in record ||
    'tool_call_id' in record ||
    'input' in record ||
    'output' in record ||
    'arguments' in record ||
    'result' in record ||
    'errorText' in record ||
    'error_text' in record
  );
}

function normalizeTextPart(
  messageId: string,
  index: number,
  role: GatewayChatRole,
  text: string,
  raw: unknown,
  type?: string,
  options?: { isStreaming?: boolean; partId?: string }
): GatewayChatTextPart | null {
  const normalizedText = role === 'assistant' ? stripThinkingTags(text) : text;
  if (!normalizedText) {
    return null;
  }

  return {
    kind: 'text',
    id: options?.partId ?? buildPartId(messageId, index),
    type,
    text: normalizedText,
    raw,
    isStreaming: options?.isStreaming,
  };
}

function normalizeErrorPart(
  messageId: string,
  index: number,
  raw: unknown,
  type?: string
): GatewayChatErrorPart {
  const record = asRecord(raw);
  return {
    kind: 'error',
    id: record ? readPartId(record, messageId, index) : buildPartId(messageId, index),
    type,
    message:
      (record && readFirstString(record, ['message', 'errorText', 'error_text', 'error'])) ||
      'Unknown error',
    raw,
  };
}

function resolveToolState(
  record: Record<string, unknown>,
  type?: string,
  errorText?: string | null
) {
  const nestedState = asRecord(record.state);
  const explicit =
    asString(record.state) ?? (nestedState ? readFirstString(nestedState, ['status']) : null);
  if (explicit) {
    return explicit;
  }

  if (errorText) {
    return 'output-error';
  }

  if (type && TOOL_RESULT_TYPES.has(type)) {
    return 'output-available';
  }

  if (type && TOOL_CALL_TYPES.has(type)) {
    return 'input-available';
  }

  if (
    'input' in record ||
    'arguments' in record ||
    (nestedState && ('input' in nestedState || 'arguments' in nestedState))
  ) {
    return 'input-available';
  }

  if (
    'output' in record ||
    'result' in record ||
    (nestedState && ('output' in nestedState || 'result' in nestedState))
  ) {
    return 'output-available';
  }

  return undefined;
}

function normalizeToolPart(
  part: unknown,
  messageId: string,
  index: number,
  type?: string
): GatewayChatToolPart | GatewayChatUnknownPart {
  const record = asRecord(part);
  if (!record) {
    return {
      kind: 'unknown',
      id: buildPartId(messageId, index),
      type,
      raw: part,
    };
  }

  const nestedState = asRecord(record.state);
  const toolName =
    readFirstString(record, ['toolName', 'tool_name', 'tool']) ??
    (type && (TOOL_CALL_TYPES.has(type) || TOOL_RESULT_TYPES.has(type))
      ? readFirstString(record, ['name'])
      : null);
  const errorText =
    readFirstString(record, ['errorText', 'error_text', 'error']) ??
    (nestedState ? readFirstString(nestedState, ['error', 'errorText', 'error_text']) : null);
  const input =
    record.input ??
    record.arguments ??
    record.args ??
    nestedState?.input ??
    nestedState?.arguments ??
    nestedState?.args;
  const output =
    record.output ??
    record.result ??
    (typeof record.content === 'string' ? record.content : undefined) ??
    nestedState?.output ??
    nestedState?.result ??
    (type && TOOL_RESULT_TYPES.has(type) ? record.text ?? nestedState?.text : undefined);

  if (!toolName && !type && input === undefined && output === undefined && !errorText) {
    return {
      kind: 'unknown',
      id: readPartId(record, messageId, index),
      type,
      raw: part,
    };
  }

  return {
    kind: 'tool',
    id: readPartId(record, messageId, index),
    type,
    toolName: toolName ?? undefined,
    state: resolveToolState(record, type, errorText),
    input,
    output,
    errorText: errorText ?? undefined,
    raw: part,
  };
}

function normalizeUnknownPart(
  part: unknown,
  messageId: string,
  index: number,
  type?: string
): GatewayChatUnknownPart {
  const record = asRecord(part);
  return {
    kind: 'unknown',
    id: record ? readPartId(record, messageId, index) : buildPartId(messageId, index),
    type,
    raw: part,
  };
}

function normalizePart(
  part: unknown,
  messageId: string,
  index: number,
  role: GatewayChatRole,
  options?: { isStreaming?: boolean }
): GatewayChatMessagePart | null {
  const record = asRecord(part);
  if (!record) {
    return null;
  }

  const type = asString(record.type)?.toLowerCase();

  if (type === 'text' && typeof record.text === 'string') {
    return normalizeTextPart(
      messageId,
      index,
      role,
      record.text,
      part,
      type,
      {
        ...options,
        partId: readPartId(record, messageId, index),
      }
    );
  }

  if (type === 'error') {
    return normalizeErrorPart(messageId, index, part, type);
  }

  if (isToolLikePart(record, type)) {
    return normalizeToolPart(part, messageId, index, type);
  }

  if (typeof record.text === 'string') {
    return normalizeTextPart(
      messageId,
      index,
      role,
      record.text,
      part,
      type,
      {
        ...options,
        partId: readPartId(record, messageId, index),
      }
    );
  }

  return normalizeUnknownPart(part, messageId, index, type);
}

export function normalizeChatMessagePart(
  part: unknown,
  messageId: string,
  role: GatewayChatRole,
  index = 0,
  options?: { isStreaming?: boolean }
) {
  return normalizePart(part, messageId, index, role, options);
}

function normalizeParts(
  messageId: string,
  role: GatewayChatRole,
  record: Record<string, unknown>,
  options?: { isStreaming?: boolean }
) {
  const type = asString(record.type)?.toLowerCase() ?? undefined;
  const rawParts = Array.isArray(record.parts)
    ? record.parts
    : Array.isArray(record.content)
      ? record.content
      : null;

  const parts = rawParts
    ?.map((part, index) => normalizePart(part, messageId, index, role, options))
    .filter((part): part is GatewayChatMessagePart => Boolean(part));

  if (parts && parts.length > 0) {
    return parts;
  }

  if (isToolLikePart(record, type) && role !== 'toolResult') {
    return [normalizeToolPart(record, messageId, 0, type)];
  }

  if (typeof record.content === 'string') {
    const textPart = normalizeTextPart(
      messageId,
      0,
      role,
      record.content,
      record.content,
      type ?? 'text',
      options
    );
    return textPart ? [textPart] : [];
  }

  if (typeof record.text === 'string') {
    const textPart = normalizeTextPart(
      messageId,
      0,
      role,
      record.text,
      record.text,
      type ?? 'text',
      options
    );
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
  fallbackSessionKey: string,
  options: NormalizeChatMessageOptions = {}
): GatewayChatMessage | null {
  const record = asRecord(message);
  if (!record) {
    return null;
  }

  const roleValue = asRole(record.role) ?? options.fallbackRole ?? null;
  if (!roleValue) {
    return null;
  }

  const messageId =
    asString(record.id) ??
    options.fallbackMessageId ??
    `${fallbackSessionKey}:${roleValue}:${readCreatedAt(record)}`;
  const sessionKey = asString(record.sessionKey) ?? fallbackSessionKey;
  const createdAt = readCreatedAt(record, options.fallbackCreatedAt);
  const parts = normalizeParts(messageId, roleValue, record, {
    isStreaming: record.status === 'streaming',
  });

  return {
    id: messageId,
    sessionKey,
    role: roleValue,
    status: 'final',
    createdAt,
    parts,
    raw: message,
  };
}

function normalizeMessageStatus(
  state: NormalizedGatewayChatEvent['state']
): GatewayChatMessageStatus {
  if (state === 'delta') {
    return 'streaming';
  }

  if (state === 'error') {
    return 'error';
  }

  if (state === 'aborted') {
    return 'aborted';
  }

  return 'final';
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

    const message = normalizeChatMessage(record.message, sessionKey, {
      fallbackMessageId: `${sessionKey}:${runId}:assistant`,
      fallbackRole: 'assistant',
    });

    return {
      runId,
      sessionKey,
      state,
      message: message
        ? {
            ...message,
            status: normalizeMessageStatus(state),
          }
        : undefined,
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

    const state =
      event === 'chat.run.completed'
        ? 'final'
        : event === 'chat.run.aborted'
          ? 'aborted'
          : 'error';

    return {
      runId,
      sessionKey,
      state,
      message:
        normalizeChatMessage(structured.message, sessionKey, {
          fallbackMessageId: `${sessionKey}:${runId}:assistant`,
          fallbackRole: 'assistant',
        }) ?? undefined,
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

    const state =
      stateValue === 'completed' || stateValue === 'final'
        ? 'final'
        : stateValue === 'aborted'
          ? 'aborted'
          : stateValue === 'error' || stateValue === 'errored'
            ? 'error'
            : 'delta';

    return {
      runId,
      sessionKey,
      state,
      message:
        normalizeChatMessage(structured.message, sessionKey, {
          fallbackMessageId: `${sessionKey}:${runId}:assistant`,
          fallbackRole: 'assistant',
        }) ?? undefined,
      errorMessage: asString(structured.errorMessage) ?? undefined,
    };
  }

  if (event === 'chat.message.updated') {
    const runId = asString(structured.runId);
    const sessionKey = asString(structured.sessionKey) ?? fallbackSessionKey;
    const fallbackRole =
      asRole(structured.role) ??
      asRole(structured.messageRole) ??
      'assistant';

    if (!runId) {
      return null;
    }

    const message = normalizeChatMessage(
      structured.message ?? structured,
      sessionKey,
      {
        fallbackMessageId: `${sessionKey}:${runId}:assistant`,
        fallbackRole,
      }
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
    const fallbackRole =
      asRole(structured.role) ??
      asRole(structured.messageRole) ??
      (partRecord ? asRole(partRecord.role) : null) ??
      'assistant';
    const message = normalizeChatMessage(structured.message, sessionKey, {
      fallbackMessageId:
        asString(structured.messageId) ??
        asString(structured.messageID) ??
        (partRecord ? readMessageId(partRecord) : null) ??
        undefined,
      fallbackRole,
    });
    const messageId =
      message?.id ??
      asString(structured.messageId) ??
      asString(structured.messageID) ??
      (partRecord ? readMessageId(partRecord) : null);

    if (!runId || !messageId) {
      return null;
    }

    const part = normalizeChatMessagePart(
      structured.part,
      messageId,
      fallbackRole,
      0,
      { isStreaming: true }
    );

    return {
      runId,
      sessionKey,
      state: 'delta',
      messageId,
      messageRole: fallbackRole,
      messageCreatedAt:
        message?.createdAt ??
        (partRecord ? readCreatedAt(partRecord) : Date.now()),
      message: message
        ? {
            ...message,
            status: 'streaming',
          }
        : undefined,
      part: part ?? undefined,
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

export function getVisibleMessageParts(
  message: GatewayChatMessage
): GatewayVisibleChatMessagePart[] {
  return message.parts.filter(
    (part): part is GatewayVisibleChatMessagePart =>
      part.kind === 'text' || part.kind === 'error'
  );
}

export function getToolMessageParts(message: GatewayChatMessage) {
  return message.parts.filter(
    (part): part is GatewayChatToolPart => part.kind === 'tool'
  );
}

export function hasRenderableMessage(message: GatewayChatMessage) {
  return (
    message.status === 'streaming' ||
    getVisibleMessageParts(message).length > 0 ||
    getToolMessageParts(message).length > 0
  );
}

export function getMessageText(message: GatewayChatMessage) {
  return getVisibleMessageParts(message)
    .map(part => {
      if (part.kind === 'text') {
        return part.text;
      }

      return part.message;
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}
