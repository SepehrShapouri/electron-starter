import ClawpilotText from '@/components/icons/ClawpilotText.svg';
import IconDot from '@/components/icons/IconDot.svg';
import { GatewayRuntimeBridge } from '@/components/app/gateway-runtime-bridge';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { useGatewayConnection } from '@/lib/gateway/store';
import { cn } from '@/lib/utils';
import { Outlet } from '@tanstack/react-router';
import { NavUser } from '../nav-user';
import { AppSidebar } from '../ui/app-sidebar';
import { Badge } from '../ui/badge';
import { BarsSpinner } from '../bars-spinner';

export function getGatewayBadgeState(connection: {
  status:
    | 'idle'
    | 'connecting'
    | 'authenticating'
    | 'ready'
    | 'degraded'
    | 'reconnecting'
    | 'auth_failed'
    | 'error';
  stale: boolean;
}) {
  if (connection.status === 'ready') {
    return {
      variant: connection.stale ? 'secondaryWarning' : 'secondarySuccess',
      label: connection.stale ? 'Degraded' : 'Connected',
    } as const;
  }

  if (connection.status === 'degraded') {
    return {
      variant: 'secondaryWarning',
      label: 'Degraded',
    } as const;
  }

  if (connection.status === 'auth_failed') {
    return {
      variant: 'secondaryDestructive',
      label: 'Auth required',
    } as const;
  }

  if (
    connection.status === 'reconnecting' ||
    connection.status === 'connecting' ||
    connection.status === 'authenticating'
  ) {
    return {
      variant: 'default',
      label: 'Reconnecting',
    } as const;
  }

  if (connection.status === 'error') {
    return {
      variant: 'secondaryDestructive',
      label: 'Connection issue',
    } as const;
  }

  return {
    variant: 'secondary',
    label: 'Disconnected',
  } as const;
}

export default function AppLayout() {
  return (
    <SidebarProvider
      className="h-screen flex min-h-0"
      style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
    >
      <GatewayRuntimeBridge />
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <SidebarHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export const SidebarHeader = () => {
  const { open } = useSidebar();
  const isFullscreen = useFullscreen();
  const connection = useGatewayConnection();
  const reconnectingStatus =
    connection.status === 'reconnecting' ||
    connection.status === 'connecting' ||
    connection.status === 'authenticating';
  const badge = getGatewayBadgeState(connection);

  return (
    <header
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className={cn(
        'flex transition-all pl-0 shrink-0 items-center p-2',
        !open && !isFullscreen && 'pl-[96px]!'
      )}
    >
      <div className="flex items-center w-full justify-between px-2 py-1.5">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <ClawpilotText />
        </div>

        <div className="flex items-center gap-2">
          <Badge size="lg" variant={badge.variant}>
            {reconnectingStatus ? (
              <BarsSpinner size={16} />
            ) : (
              <IconDot className="size-4" />
            )}{' '}
            {badge.label}
          </Badge>
          <NavUser />
        </div>
      </div>
    </header>
  );
};
