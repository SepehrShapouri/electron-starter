import type { ComposioAccount } from '@/lib/integrations-api';
import type { IntegrationStatus, StaticIntegration } from './constants';

export const normalizeToolkit = (value: string): string =>
  value.trim().toLowerCase();

export const normalizeSearchText = (value: string): string =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

export const matchesIntegrationSearch = (
  integration: StaticIntegration,
  query: string
): boolean => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const searchIndex = normalizeSearchText(
    [
      integration.name,
      integration.description,
      integration.longDescription,
      integration.toolkit,
      ...(integration.toolkitAliases ?? []),
      ...integration.features,
    ].join(' ')
  );

  return normalizedQuery.split(' ').every(term => searchIndex.includes(term));
};

export const resolveStatuses = (
  accounts: ComposioAccount[],
  integrations: StaticIntegration[]
): {
  statuses: Record<string, IntegrationStatus>;
  byToolkit: Record<string, ComposioAccount[]>;
} => {
  const statuses: Record<string, IntegrationStatus> = {};
  const byToolkit: Record<string, ComposioAccount[]> = {};
  const integrationByToolkit = new Map<string, string>();

  for (const integration of integrations) {
    statuses[integration.id] = 'not_connected';
    byToolkit[integration.id] = [];
    integrationByToolkit.set(
      normalizeToolkit(integration.toolkit),
      integration.id
    );

    for (const alias of integration.toolkitAliases ?? []) {
      integrationByToolkit.set(normalizeToolkit(alias), integration.id);
    }
  }

  for (const account of accounts) {
    const toolkit = normalizeToolkit(account.toolkit);
    const status = normalizeToolkit(account.status);
    const integrationId = integrationByToolkit.get(toolkit);

    if (!integrationId || status !== 'active') {
      continue;
    }

    byToolkit[integrationId].push(account);
    statuses[integrationId] = 'connected';
  }

  return { statuses, byToolkit };
};

export const getAccountLabel = (
  account: ComposioAccount,
  fallback: string
): string => {
  if (account.label) {
    return account.label;
  }

  if (account.userId?.includes('@')) {
    return account.userId;
  }

  return fallback;
};

export const getAccountMetaLabel = (account: ComposioAccount): string => {
  const id = account.connectedAccountId;
  return `ID ${id.slice(0, 8)}...${id.slice(-4)}`;
};
