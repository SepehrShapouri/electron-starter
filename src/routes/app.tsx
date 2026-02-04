import { createFileRoute, redirect } from '@tanstack/react-router';
import type { RouterContext } from '@/utils/routes';
import AppLayout from '@/components/app/app-layout';
import { authApi } from '@/lib/auth-api';

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ context }) => {
    const { queryClient } = context as RouterContext;
    const session = await queryClient
      .fetchQuery({
        queryKey: ['session'],
        queryFn: authApi.getSession,
      })
      .catch(() => null);

    if (!session) {
      throw redirect({ to: '/auth/login' });
    }

    return { session };
  },
  component: AppLayout,
});
