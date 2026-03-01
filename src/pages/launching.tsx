import { authApi } from '@/lib/auth-api';
import { ProvisioningStepsLoader } from '@/features/onboarding/components/provisioning-steps-loader';
import { useGatewayProvision } from '@/lib/use-gateway-provision';
import { Button } from '@/components/ui/button';
import Clawpilot from '@/components/icons/Clawpilot.svg';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';

type LaunchStatus = 'provisioning' | 'pending' | 'running';

const ONBOARDING_LAUNCH_STATUS_MOCK_ENABLED = false;

const STATUS_META: Record<
  LaunchStatus,
  { label: string; description: string }
> = {
  provisioning: {
    label: 'Allocating compute',
    description: 'Securing runtime and resources for your agent.',
  },
  pending: {
    label: 'Finalizing services',
    description: 'Applying configuration and warming up services.',
  },
  running: {
    label: 'Agent is ready',
    description: 'Everything is online. Redirecting you now...',
  },
};

const toLaunchStatus = (value: string | null | undefined): LaunchStatus => {
  if (value === 'running') {
    return 'running';
  }

  if (value === 'pending') {
    return 'pending';
  }

  return 'provisioning';
};

const getUserIdFromSession = (session: unknown) => {
  if (!session || typeof session !== 'object') {
    return '';
  }

  const sessionRecord = session as {
    user?: { id?: unknown };
    id?: unknown;
  };

  if (typeof sessionRecord.user?.id === 'string') {
    return sessionRecord.user.id.trim();
  }

  if (typeof sessionRecord.id === 'string') {
    return sessionRecord.id.trim();
  }

  return '';
};

export default function LaunchingPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const hasNavigatedRef = useRef(false);
  const [mockStatus, setMockStatus] = useState<LaunchStatus>('provisioning');

  const { provisionQuery } = useGatewayProvision({
    enabled: !ONBOARDING_LAUNCH_STATUS_MOCK_ENABLED,
  });

  const profile = provisionQuery.data ?? null;
  const launchInstanceId = profile?.instanceId ?? null;

  const instanceStatusQuery = useQuery({
    queryKey: ['instance-status', launchInstanceId],
    queryFn: () => authApi.getProvisionStatus(launchInstanceId as string),
    enabled:
      !ONBOARDING_LAUNCH_STATUS_MOCK_ENABLED &&
      Boolean(launchInstanceId) &&
      Boolean(profile) &&
      profile?.status !== 'running',
    refetchInterval: query => {
      const taskStatus =
        query.state.data?.taskStatus ?? query.state.data?.status;
      return taskStatus === 'running' ? false : 5000;
    },
  });

  const effectiveStatus = useMemo<LaunchStatus>(() => {
    if (ONBOARDING_LAUNCH_STATUS_MOCK_ENABLED) {
      return mockStatus;
    }

    const taskStatus =
      instanceStatusQuery.data?.taskStatus ?? profile?.status ?? 'provisioning';

    return toLaunchStatus(taskStatus);
  }, [instanceStatusQuery.data?.taskStatus, mockStatus, profile?.status]);

  const statusMeta = STATUS_META[effectiveStatus];

  const allowOriginsMutation = useMutation({
    mutationFn: async () => {
      const gatewayUrl = profile?.gatewayUrl?.trim();
      const gatewayToken = profile?.gatewayToken?.trim();
      let composioDefaultUserId = profile?.userId?.trim() ?? '';

      if (!gatewayUrl || !gatewayToken) {
        throw new Error('Gateway credentials are not ready yet.');
      }

      if (!composioDefaultUserId) {
        const session = await authApi.getSession().catch(() => null);
        composioDefaultUserId = getUserIdFromSession(session);
      }

      if (!composioDefaultUserId) {
        throw new Error('Unable to resolve user id for Composio setup.');
      }

      if (!window.electronAPI) {
        throw new Error('Desktop IPC is required for final gateway setup.');
      }

      await window.electronAPI.patchGatewayControlUiOrigins({
        gatewayUrl,
        token: gatewayToken,
        origins: ['null', 'http://localhost:5173'],
        composioDefaultUserId,
      });
    },
  });

  const statusDescription = useMemo(() => {
    if (effectiveStatus !== 'running') {
      return statusMeta.description;
    }

    if (allowOriginsMutation.isPending) {
      return 'Applying final gateway configuration before you enter the app.';
    }

    if (allowOriginsMutation.isSuccess) {
      return 'Gateway access is ready. Redirecting you now...';
    }

    if (allowOriginsMutation.isError) {
      return allowOriginsMutation.error instanceof Error
        ? allowOriginsMutation.error.message
        : 'Failed to finalize gateway configuration.';
    }

    return 'Running final gateway checks before redirecting you.';
  }, [
    allowOriginsMutation.error,
    allowOriginsMutation.isError,
    allowOriginsMutation.isPending,
    allowOriginsMutation.isSuccess,
    effectiveStatus,
    statusMeta.description,
  ]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      gsap.set([containerRef.current, headerRef.current], {
        opacity: 1,
        y: 0,
      });
      return;
    }

    const timeline = gsap.timeline();
    timeline
      .fromTo(
        containerRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }
      )
      .fromTo(
        headerRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
        '-=0.25'
      );

    return () => {
      timeline.kill();
    };
  }, []);

  useEffect(() => {
    if (!statusRef.current) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(statusRef.current, { opacity: 1, y: 0 });
      return;
    }

    const tween = gsap.fromTo(
      statusRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );

    return () => {
      tween.kill();
    };
  }, [effectiveStatus]);

  useEffect(() => {
    if (!ONBOARDING_LAUNCH_STATUS_MOCK_ENABLED) {
      return;
    }

    const toPending = window.setTimeout(() => {
      setMockStatus('pending');
    }, 1500);

    const toRunning = window.setTimeout(() => {
      setMockStatus('running');
    }, 3500);

    return () => {
      window.clearTimeout(toPending);
      window.clearTimeout(toRunning);
    };
  }, []);

  useEffect(() => {
    if (effectiveStatus !== 'running') {
      return;
    }

    if (allowOriginsMutation.isPending || allowOriginsMutation.isSuccess) {
      return;
    }

    if (allowOriginsMutation.isError) {
      return;
    }

    if (!profile?.gatewayUrl || !profile?.gatewayToken) {
      return;
    }

    allowOriginsMutation.mutate();
  }, [
    allowOriginsMutation,
    effectiveStatus,
    profile?.gatewayToken,
    profile?.gatewayUrl,
  ]);

  useEffect(() => {
    if (
      effectiveStatus !== 'running' ||
      !allowOriginsMutation.isSuccess ||
      hasNavigatedRef.current
    ) {
      return;
    }

    hasNavigatedRef.current = true;
    const timeout = window.setTimeout(() => {
      navigate({ to: '/app' });
    }, 900);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [allowOriginsMutation.isSuccess, effectiveStatus, navigate]);

  if (
    !ONBOARDING_LAUNCH_STATUS_MOCK_ENABLED &&
    !profile &&
    provisionQuery.isLoading
  ) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,_color-mix(in_oklab,_var(--foreground)_7%,_transparent)_0%,_transparent_40%),radial-gradient(circle_at_86%_86%,_color-mix(in_oklab,_var(--foreground)_5%,_transparent)_0%,_transparent_42%)]" />
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl px-5 py-8 sm:px-6"
      >
        <div ref={headerRef} className="relative flex flex-col gap-3">
          <Clawpilot className="h-9 w-9 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <p className="text-balance text-2xl font-light tracking-tight text-foreground sm:text-3xl">
              Launching your agent
            </p>
            <p className="text-sm text-muted-foreground">
              Creating secure shell for your lobster.
            </p>
          </div>
        </div>

        <div className="relative mt-8 rounded-2xl bg-background-2/55 p-4 sm:p-5">
          <p ref={statusRef} className="mb-4 text-sm text-muted-foreground">
            {statusDescription}
          </p>
          <ProvisioningStepsLoader status={effectiveStatus} />
          {allowOriginsMutation.isError && (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => allowOriginsMutation.mutate()}
              >
                Retry Final Setup
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
