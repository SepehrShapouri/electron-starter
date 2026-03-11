import OnboardingPage from '@/pages/onboarding';
import { authApi } from '@/lib/auth-api';
import type { RouterContext } from '@/utils/routes';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';

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
    <BackgroundGradientAnimation
      gradientBackgroundStart="rgb(45, 74, 112)"
      gradientBackgroundEnd="rgb(28, 53, 89)"
      firstColor="18, 117, 255"
      secondColor="213, 33, 255"
      thirdColor="145, 230, 255"
      fourthColor="255, 255, 216"
      fifthColor="255, 105, 105"
      pointerColor="140, 100, 255"
      size="100%"
      blendingValue="hard-light"
    >
      <div className="absolute z-50 inset-0 flex items-center justify-center mx-auto p-20">
        <div className="max-w-238 w-full h-full flex items-center justify-center">
          <OnboardingPage
            checkoutStatus={search.checkout}
            encryptedData={search.data}
          />
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}
