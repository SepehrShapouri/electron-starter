import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { ThemeProvider } from './components/theme-provider.tsx';
import './index.css';

import { TooltipProvider } from '@/components/ui/tooltip';
import { authApi } from '@/lib/auth-api';
import { setAuthToken } from '@/lib/axios';
import { useGatewayLifecycleToasts } from '@/lib/use-gateway-lifecycle-toasts';
import { Toaster } from 'sileo';
import { router } from './utils/routes';
const queryClient = new QueryClient();

function GatewayLifecycleBridge() {
  useGatewayLifecycleToasts();
  return null;
}

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
          nextPath: getSafeDeepLinkPath(parsed.searchParams.get('next'), '/app'),
        };
      }
    }

    if (parsed.pathname === '/callback') {
      return {
        type: 'callback' as const,
        nextPath: getSafeDeepLinkPath(
          parsed.searchParams.get('next'),
          '/app/integrations',
        ),
      };
    }

    if (parsed.pathname === '/error') {
      return {
        type: 'error' as const,
        nextPath: getSafeDeepLinkPath(
          parsed.searchParams.get('next'),
          '/auth/login',
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
        router.navigate({ to: deepLink.nextPath });
        return;
      }

      setAuthToken(deepLink.token);

      const session = await authApi.getSession().catch(() => null);
      if (!session) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['session'] });
      router.navigate({ to: deepLink.nextPath });
    };

    window.electronAPI.getPendingAuthDeepLink().then(url => {
      if (!url) {
        return;
      }

      void syncSessionFromDeepLink(url);
    });

    const removeAuthDeepLinkListener = window.electronAPI.onAuthDeepLink(url => {
      void syncSessionFromDeepLink(url);
    });

    return () => {
      removeAuthDeepLinkListener();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <GatewayLifecycleBridge />
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
