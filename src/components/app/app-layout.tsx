import ClawpilotText from '@/components/icons/ClawpilotText.svg';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { cn } from '@/lib/utils';
import { Outlet } from '@tanstack/react-router';
import { AppSidebar } from '../ui/app-sidebar';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
export default function AppLayout() {
  return (
    <SidebarProvider
      className="h-screen flex min-h-0"
      style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
    >
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
          <Badge size="lg" variant="secondarySuccess">Connected</Badge>
          <Avatar>
            <AvatarFallback>SS</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};
