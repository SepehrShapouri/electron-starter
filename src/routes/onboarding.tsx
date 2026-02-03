import { createFileRoute, redirect } from '@tanstack/react-router';
import Onboarding from '../pages/Onboarding';
import { authApi } from '../lib/auth-api';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient
      .fetchQuery({
        queryKey: ['session'],
        queryFn: authApi.getSession,
      })
      .catch(() => null);

    if (!session) {
      throw redirect({ to: '/login' });
    }

    const onboarding = await context.queryClient
      .fetchQuery({
        queryKey: ['onboarding'],
        queryFn: authApi.getOnboarding,
      })
      .catch(() => null);

    if (onboarding?.completed) {
      throw redirect({ to: '/' });
    }

    return { session };
  },
  component: Onboarding,
});
