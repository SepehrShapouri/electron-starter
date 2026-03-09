export type SessionDefaultsSnapshot = {
  defaultAgentId?: string;
  mainKey?: string;
  mainSessionKey?: string;
  scope?: string;
};

export type GatewayChatMessagePart =
  | {
      kind: 'text';
      id: string;
      text: string;
      isStreaming?: boolean;
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

type NormalizeChatMessageOptions = {
  fallbackMessageId?: string;
  fallbackCreatedAt?: number;
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
  fallbackSessionKey: string,
  options: NormalizeChatMessageOptions = {}
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
    options.fallbackMessageId ??
    `${fallbackSessionKey}:${roleValue}:${readCreatedAt(record)}`;
  const sessionKey = asString(record.sessionKey) ?? fallbackSessionKey;
  const createdAt = readCreatedAt(record, options.fallbackCreatedAt);
  const parts = normalizeParts(messageId, roleValue, record);

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
    });
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
        normalizeChatMessage(structured.message, sessionKey, {
          fallbackMessageId: `${sessionKey}:${runId}:assistant`,
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
        normalizeChatMessage(structured.message, sessionKey, {
          fallbackMessageId: `${sessionKey}:${runId}:assistant`,
        }) ?? undefined,
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
      sessionKey,
      {
        fallbackMessageId: `${sessionKey}:${runId}:assistant`,
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
    const message = normalizeChatMessage(structured.message, sessionKey, {
      fallbackMessageId:
        asString(structured.messageId) ??
        asString(structured.messageID) ??
        (partRecord ? readMessageId(partRecord) : null) ??
        undefined,
    });
    const messageId =
      message?.id ??
      asString(structured.messageId) ??
      asString(structured.messageID) ??
      (partRecord ? readMessageId(partRecord) : null);
    const messageRole =
      message?.role ??
      asRole(structured.role) ??
      asRole(structured.messageRole) ??
      (partRecord ? asRole(partRecord.role) : null) ??
      'assistant';

    if (!runId || !messageId) {
      return null;
    }

    const part = normalizeChatMessagePart(
      structured.part,
      messageId,
      messageRole
    );

    return {
      runId,
      sessionKey,
      state: 'delta',
      messageId,
      messageRole,
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

export function getMessageText(message: GatewayChatMessage) {
  return message.parts
    .map(part => {
      if (part.kind === 'text') {
        return part.text;
      }

      if (part.kind === 'error') {
        return part.message;
      }

      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}
