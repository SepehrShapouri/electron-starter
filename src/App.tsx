import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import type { ParsedLocation } from '@tanstack/router-core';
import { useEffect, useRef } from 'react';
import { ThemeProvider } from './components/theme-provider.tsx';
import './index.css';

import { TooltipProvider } from '@/components/ui/tooltip';
import { authApi } from '@/lib/auth-api';
import {
  captureAnalyticsEvent,
  capturePageview,
  clearPendingSignupIntent,
  consumePendingSignupIntent,
  identifyAnalyticsUser,
  initAnalytics,
} from '@/lib/analytics';
import { hasAuthToken, setAuthToken } from '@/lib/axios';
import { Toaster } from 'sileo';
import { router } from './utils/routes';
const queryClient = new QueryClient();

type DeepLinkRoute =
  | '/app'
  | '/app/integrations'
  | '/onboarding'
  | '/auth/welcome'
  | '/auth/login'
  | '/auth/login-magic-link'
  | '/auth/signup-magic-link';

const getSafeDeepLinkPath = (value: string | null, fallback: DeepLinkRoute) => {
  if (
    value === '/app' ||
    value === '/app/integrations' ||
    value === '/onboarding' ||
    value === '/auth/welcome' ||
    value === '/auth/login' ||
    value === '/auth/login-magic-link' ||
    value === '/auth/signup-magic-link'
  ) {
    return value;
  }

  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return fallback;
};

const parseAuthDeepLink = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'clawpilot:') {
      return null;
    }

    if (parsed.hostname === 'onboarding') {
      const checkoutParam = parsed.searchParams.get('checkout');
      const checkout: 'success' | 'cancel' | undefined =
        checkoutParam === 'success' || checkoutParam === 'cancel'
          ? checkoutParam
          : undefined;
      return {
        type: 'onboarding' as const,
        checkout,
        data: parsed.searchParams.get('data') ?? undefined,
      };
    }

    if (parsed.hostname !== 'auth') {
      return null;
    }

    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const tokenKeys = ['token', 'access_token', 'bearerToken', 'bearer_token'];

    for (const key of tokenKeys) {
      const token = parsed.searchParams.get(key) ?? hashParams.get(key);
      if (token) {
        return {
          type: 'success' as const,
          token,
          nextPath: getSafeDeepLinkPath(
            parsed.searchParams.get('next'),
            '/app'
          ),
        };
      }
    }

    if (parsed.pathname === '/callback') {
      return {
        type: 'callback' as const,
        nextPath: getSafeDeepLinkPath(
          parsed.searchParams.get('next'),
          '/app/integrations'
        ),
      };
    }

    if (parsed.pathname === '/error') {
      return {
        type: 'error' as const,
        nextPath: getSafeDeepLinkPath(
          parsed.searchParams.get('next'),
          '/auth/login'
        ),
      };
    }

    return {
      type: 'unknown' as const,
    };
  } catch {
    return null;
  }
};

function App() {
  const handledDeepLinkRef = useRef<string | null>(null);
  const trackedPageviewRef = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();

    const trackRoute = (
      location: ParsedLocation,
      fromLocation?: ParsedLocation
    ) => {
      if (trackedPageviewRef.current === location.href) {
        return;
      }

      trackedPageviewRef.current = location.href;
      capturePageview(location, fromLocation);
      if (hasAuthToken()) {
        identifyAnalyticsUser(queryClient.getQueryData(['session']));
      }
    };

    const initialLocation =
      router.state.resolvedLocation ?? router.state.location;
    if (initialLocation) {
      trackRoute(initialLocation);
    }

    const removeRouteListener = router.subscribe('onResolved', event => {
      trackRoute(event.toLocation, event.fromLocation);
    });

    return () => {
      removeRouteListener();
    };
  }, []);

  useEffect(() => {
    if (!window.electronAPI) {
      return;
    }

    const syncSessionFromDeepLink = async (url: string) => {
      if (handledDeepLinkRef.current === url) {
        return;
      }
      handledDeepLinkRef.current = url;

      const deepLink = parseAuthDeepLink(url);
      if (!deepLink || deepLink.type === 'unknown') {
        return;
      }

      if (deepLink.type === 'onboarding') {
        router.navigate({
          to: '/onboarding',
          search: {
            ...(deepLink.checkout ? { checkout: deepLink.checkout } : {}),
            ...(deepLink.data ? { data: deepLink.data } : {}),
          },
        });
        return;
      }

      if (deepLink.type === 'callback') {
        router.navigate({ to: deepLink.nextPath });
        return;
      }

      if (deepLink.type === 'error') {
        clearPendingSignupIntent();
        router.navigate({ to: deepLink.nextPath });
        return;
      }

      setAuthToken(deepLink.token);

      const session = await queryClient
        .fetchQuery({
          queryKey: ['session'],
          queryFn: authApi.getSession,
        })
        .catch(() => null);
      if (!session) {
        return;
      }

      identifyAnalyticsUser(session);

      const pendingSignupIntent = consumePendingSignupIntent();
      if (pendingSignupIntent) {
        captureAnalyticsEvent('app_signup', {
          method: pendingSignupIntent.method,
        });
      }

      router.navigate({ to: deepLink.nextPath });
    };

    window.electronAPI.getPendingAuthDeepLink().then(url => {
      if (!url) {
        return;
      }

      void syncSessionFromDeepLink(url);
    });

    const removeAuthDeepLinkListener = window.electronAPI.onAuthDeepLink(
      url => {
        void syncSessionFromDeepLink(url);
      }
    );

    return () => {
      removeAuthDeepLinkListener();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            options={{ fill: 'black', styles: { description: 'text-white' } }}
            position="top-center"
          />
          <RouterProvider router={router} context={{ queryClient }} />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
