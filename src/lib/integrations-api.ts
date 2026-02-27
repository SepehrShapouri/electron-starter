import { apiClient, getApiErrorMessage } from './axios';

export type ComposioAccount = {
  connectedAccountId: string;
  toolkit: string;
  status: string;
  userId?: string;
  label?: string;
};

type RawComposioAccount = {
  connectedAccountId?: unknown;
  connected_account_id?: unknown;
  toolkit?: unknown;
  status?: unknown;
  userId?: unknown;
  user_id?: unknown;
  email?: unknown;
  emailAddress?: unknown;
  accountEmail?: unknown;
  accountIdentifier?: unknown;
  account_identifier?: unknown;
  accountEmailAddress?: unknown;
  email_id?: unknown;
  emailId?: unknown;
  primaryEmail?: unknown;
  userEmail?: unknown;
  user_email?: unknown;
  accountUserId?: unknown;
  displayLabel?: unknown;
  display_name?: unknown;
  accountName?: unknown;
  workspaceName?: unknown;
  metadata?: unknown;
  meta?: unknown;
  profile?: unknown;
  data?: unknown;
  user?: unknown;
  account?: unknown;
  authConfig?: unknown;
  auth_config?: unknown;
};

type ComposioStatusResponse = {
  accounts?: RawComposioAccount[];
};

type ComposioConnectResponse = {
  url?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const firstNonEmptyString = (values: unknown[]): string | undefined =>
  values.find(value => typeof value === 'string' && value.trim().length > 0) as
    | string
    | undefined;

const pickRecordValue = (
  record: Record<string, unknown> | null,
  keys: string[]
): string | undefined => {
  if (!record) return undefined;

  return firstNonEmptyString(keys.map(key => record[key]));
};

const normalizeAccount = (
  input: RawComposioAccount
): ComposioAccount | null => {
  const connectedAccountId =
    typeof input.connectedAccountId === 'string'
      ? input.connectedAccountId
      : typeof input.connected_account_id === 'string'
        ? input.connected_account_id
        : null;

  const toolkit = typeof input.toolkit === 'string' ? input.toolkit : null;
  const status = typeof input.status === 'string' ? input.status : 'unknown';
  const userId =
    typeof input.userId === 'string'
      ? input.userId
      : typeof input.user_id === 'string'
        ? input.user_id
        : typeof input.accountUserId === 'string'
          ? input.accountUserId
          : undefined;

  const nestedRecords = [
    asRecord(input.metadata),
    asRecord(input.meta),
    asRecord(input.profile),
    asRecord(input.data),
    asRecord(input.user),
    asRecord(input.account),
    asRecord(input.authConfig),
    asRecord(input.auth_config),
  ];

  const emailKeys = [
    'email',
    'emailAddress',
    'accountEmail',
    'accountEmailAddress',
    'email_id',
    'emailId',
    'primaryEmail',
    'userEmail',
    'user_email',
    'accountIdentifier',
    'account_identifier',
  ];

  const labelKeys = [
    'displayLabel',
    'display_name',
    'accountName',
    'workspaceName',
    'name',
  ];

  const nestedEmail = firstNonEmptyString(
    nestedRecords.map(record => pickRecordValue(record, emailKeys))
  );
  const nestedLabel = firstNonEmptyString(
    nestedRecords.map(record => pickRecordValue(record, labelKeys))
  );

  const label = firstNonEmptyString([
    input.displayLabel,
    input.display_name,
    input.email,
    input.emailAddress,
    input.accountEmail,
    input.accountEmailAddress,
    input.email_id,
    input.emailId,
    input.primaryEmail,
    input.userEmail,
    input.user_email,
    input.accountIdentifier,
    input.account_identifier,
    input.accountName,
    input.workspaceName,
    nestedEmail,
    nestedLabel,
  ]);

  if (!connectedAccountId || !toolkit) {
    return null;
  }

  return {
    connectedAccountId,
    toolkit,
    status,
    userId,
    label,
  };
};

export const integrationsApi = {
  getComposioStatus: () =>
    apiClient
      .get<ComposioStatusResponse>('/api/v1/integrations/composio/status')
      .then(response => {
        const rows = Array.isArray(response.data.accounts)
          ? response.data.accounts
          : [];

        return rows
          .map(normalizeAccount)
          .filter((account): account is ComposioAccount => account !== null);
      })
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),

  connectComposioToolkit: (toolkit: string, redirectUrl?: string) =>
    apiClient
      .post<ComposioConnectResponse>('/api/v1/integrations/composio/connect', {
        toolkit,
        ...(redirectUrl ? { redirectUrl } : {}),
      })
      .then(response => {
        const url = response.data.url;
        if (!url || typeof url !== 'string') {
          throw new Error('Missing Composio redirect URL');
        }

        return { url };
      })
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),

  disconnectComposioAccount: (connectedAccountId: string) =>
    apiClient
      .post('/api/v1/integrations/composio/disconnect', { connectedAccountId })
      .then(response => response.data)
      .catch(error => {
        throw new Error(getApiErrorMessage(error));
      }),
};
