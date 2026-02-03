import { createFileRoute, redirect } from '@tanstack/react-router';
import AppHome from '../pages/AppHome';
import { authApi } from '../lib/auth-api';

export const Route = createFileRoute('/')({
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

    return { session };
  },
  component: AppHome,
});
