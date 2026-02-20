import LaunchingPage from '@/pages/launching';
import { authApi } from '@/lib/auth-api';
import type { RouterContext } from '@/utils/routes';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/launching')({
  beforeLoad: async ({ context }) => {
    const { queryClient } = context as RouterContext;
    const session = await queryClient
      .fetchQuery({
        queryKey: ['session'],
        queryFn: authApi.getSession,
      })
      .catch(() => null);

    if (!session) {
      throw redirect({ to: '/auth/welcome' });
    }

    const onboarding = await queryClient
      .fetchQuery({
        queryKey: ['onboarding'],
        queryFn: authApi.getOnboarding,
      })
      .catch(() => null);

    if (!onboarding?.completed) {
      throw redirect({ to: '/onboarding' });
    }

    return { session, onboarding };
  },
  component: LaunchingPage,
});
