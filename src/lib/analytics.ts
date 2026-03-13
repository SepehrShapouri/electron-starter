import posthog from 'posthog-js/dist/module.full.no-external.js';

import type { ParsedLocation } from '@tanstack/router-core';

import type { KeySource } from '@/features/onboarding/lib/utils';

type AnalyticsValue = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsValue | undefined>;
type UnknownRecord = Record<string, unknown>;

type PendingSignupIntent = {
  method: 'google';
  createdAt: number;
};

type PendingSubscriptionIntent = {
  provider: string;
  keySource: KeySource;
  createdAt: number;
};

const POSTHOG_KEY = 'phc_TgonSBgOIqKJA2e0GS1yzFeyzOy78KYyK6kTDNKaNoJ';
const POSTHOG_HOST = 'https://eu.i.posthog.com';
const ANALYTICS_BASE_URL = 'app://clawpilot';
const PENDING_SIGNUP_INTENT_KEY = 'clawpilot:analytics:pending_signup_intent';
const PENDING_SUBSCRIPTION_INTENT_KEY =
  'clawpilot:analytics:pending_subscription_intent';
const PENDING_INTENT_MAX_AGE_MS = 1000 * 60 * 60 * 6;

let analyticsInitialized = false;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const getStringValue = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const cleanProperties = (
  properties?: AnalyticsProperties
): Record<string, AnalyticsValue> => {
  if (!properties) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  ) as Record<string, AnalyticsValue>;
};

const getStorageItem = (key: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStorageItem = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep analytics as a no-op.
  }
};

const getStoredIntent = <T extends { createdAt: number }>(key: string) => {
  const raw = getStorageItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as T;
    if (
      typeof parsed.createdAt !== 'number' ||
      Date.now() - parsed.createdAt > PENDING_INTENT_MAX_AGE_MS
    ) {
      setStorageItem(key, null);
      return null;
    }

    return parsed;
  } catch {
    setStorageItem(key, null);
    return null;
  }
};

const extractAnalyticsUser = (session: unknown) => {
  if (!isRecord(session)) {
    return {
      distinctId: null,
      email: null,
      name: null,
    };
  }

  const user = isRecord(session.user) ? session.user : null;

  const email = getStringValue(user?.email, session.email);
  const name = getStringValue(user?.name, session.name);
  const distinctId = getStringValue(
    user?.id,
    session.userId,
    session.id,
    email
  );

  return {
    distinctId,
    email,
    name,
  };
};

const withAnalytics = (callback: (client: typeof posthog) => void) => {
  if (!initAnalytics()) {
    return;
  }

  callback(posthog);
};

export const initAnalytics = () => {
  if (analyticsInitialized) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: false,
  });

  analyticsInitialized = true;
  return true;
};

export const captureAnalyticsEvent = (
  event: string,
  properties?: AnalyticsProperties
) => {
  withAnalytics(client => {
    client.capture(event, cleanProperties(properties));
  });
};

export const capturePageview = (
  toLocation: ParsedLocation,
  fromLocation?: ParsedLocation
) => {
  captureAnalyticsEvent('$pageview', {
    $current_url: `${ANALYTICS_BASE_URL}${toLocation.href}`,
    pathname: toLocation.pathname,
    search: toLocation.searchStr || null,
    hash: toLocation.hash || null,
    from_pathname: fromLocation?.pathname ?? null,
  });
};

export const identifyAnalyticsUser = (session: unknown) => {
  const { distinctId, email, name } = extractAnalyticsUser(session);
  if (!distinctId) {
    return;
  }

  withAnalytics(client => {
    client.identify(
      distinctId,
      cleanProperties({
        email,
        name,
      })
    );
  });
};

export const resetAnalytics = () => {
  if (!analyticsInitialized) {
    return;
  }

  posthog.reset();
};

export const setPendingSignupIntent = (
  intent: Omit<PendingSignupIntent, 'createdAt'> | null
) => {
  if (!intent) {
    setStorageItem(PENDING_SIGNUP_INTENT_KEY, null);
    return;
  }

  setStorageItem(PENDING_SIGNUP_INTENT_KEY, {
    ...intent,
    createdAt: Date.now(),
  });
};

export const clearPendingSignupIntent = () => {
  setPendingSignupIntent(null);
};

export const consumePendingSignupIntent = () => {
  const intent = getStoredIntent<PendingSignupIntent>(
    PENDING_SIGNUP_INTENT_KEY
  );
  setStorageItem(PENDING_SIGNUP_INTENT_KEY, null);
  return intent;
};

export const setPendingSubscriptionIntent = (
  intent: Omit<PendingSubscriptionIntent, 'createdAt'> | null
) => {
  if (!intent) {
    setStorageItem(PENDING_SUBSCRIPTION_INTENT_KEY, null);
    return;
  }

  setStorageItem(PENDING_SUBSCRIPTION_INTENT_KEY, {
    ...intent,
    createdAt: Date.now(),
  });
};

export const clearPendingSubscriptionIntent = () => {
  setPendingSubscriptionIntent(null);
};

export const consumePendingSubscriptionIntent = () => {
  const intent = getStoredIntent<PendingSubscriptionIntent>(
    PENDING_SUBSCRIPTION_INTENT_KEY
  );
  setStorageItem(PENDING_SUBSCRIPTION_INTENT_KEY, null);
  return intent;
};
