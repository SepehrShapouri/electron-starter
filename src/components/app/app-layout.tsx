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
import { Loader, Loader2 } from 'lucide-react';

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
  const reconnectingStatus = connection.status === 'reconnecting' ||
  connection.status === 'connecting' ||
  connection.status === 'authenticating'
  const badge: {
    variant: React.ComponentProps<typeof Badge>['variant'];
    label: string;
  } =
    connection.status === 'ready'
      ? {
          variant: connection.stale ? 'secondaryWarning' : 'secondarySuccess',
          label: connection.stale ? 'Degraded' : 'Connected',
        }
      : connection.status === 'degraded'
        ? {
            variant: 'secondaryWarning' as const,
            label: 'Degraded',
          }
        : connection.status === 'reconnecting' ||
            connection.status === 'connecting' ||
            connection.status === 'authenticating'
          ? {
              variant: 'default' as const,
              label: 'Reconnecting',
            }
          : connection.status === 'error'
            ? {
                variant: 'secondaryDestructive' as const,
                label: 'Connection issue',
              }
            : {
                variant: 'secondary' as const,
                label: 'Disconnected',
              };

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
            {reconnectingStatus ? <Loader2 className='size-4 animate-spin'/> :  <IconDot className="size-4" />} {badge.label}
          </Badge>
          <NavUser />
        </div>
      </div>
    </header>
  );
};
