import { BarsSpinner } from '@/components/bars-spinner';
import Clawpilot from '@/components/icons/Clawpilot.svg';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { authApi } from '@/lib/auth-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const STATUS_META: Record<string, { label: string; percentage: number }> = {
  provisioning: { label: 'Allocating compute', percentage: 10 },
  pending: { label: 'Finalizing services', percentage: 65 },
};

type InstanceLaunchingProps = {
  status: string;
};

export function InstanceLaunching({ status }: InstanceLaunchingProps) {
  const queryClient = useQueryClient();

  const relaunchMutation = useMutation({
    mutationFn: authApi.relaunchGateway,
    onSuccess: data => {
      queryClient.setQueryData(['gateway-provision'], data);
    },
  });

  if (status === 'stopped') {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Clawpilot className="text-muted-foreground size-10" />
          </EmptyMedia>
          <EmptyTitle>Your lobster is asleep</EmptyTitle>
          <EmptyDescription>
            Your agent has been stopped. Relaunch it to pick up where you left
            off — your workspace and history are still intact.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            size="sm"
            onClick={() => relaunchMutation.mutate()}
            disabled={relaunchMutation.isPending}
          >
            {relaunchMutation.isPending && <BarsSpinner size={16} />}
            Relaunch
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const meta = STATUS_META[status] ?? STATUS_META.provisioning;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <BarsSpinner size={28} className="text-muted-foreground" />
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium text-foreground">
          Launching your agent
        </p>
        <p className="text-sm text-muted-foreground">
          {meta.percentage}% — {meta.label}
        </p>
      </div>
    </div>
  );
}
