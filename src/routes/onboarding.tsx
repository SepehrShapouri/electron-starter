import OnboardingPage from '@/pages/onboarding';
import { authApi } from '@/lib/auth-api';
import type { RouterContext } from '@/utils/routes';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const searchSchema = z.object({
  checkout: z.enum(['success', 'cancel']).optional(),
  data: z.string().optional(),
});

export const Route = createFileRoute('/onboarding')({
  validateSearch: search => searchSchema.parse(search),
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

    if (onboarding?.completed) {
      throw redirect({ to: '/app' });
    }

    return { session, onboarding };
  },
  component: OnboardingRouteComponent,
});

function OnboardingRouteComponent() {
  const search = Route.useSearch();

  return (
    <OnboardingPage
      checkoutStatus={search.checkout}
      encryptedData={search.data}
    />
  );
}
