import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { cn } from '@/lib/utils';
import { Outlet } from '@tanstack/react-router';
import { AppSidebar } from '../ui/app-sidebar';
import Clawpilot from '@/components/icons/Clawpilot.svg'
import { SidebarToggle } from './sidebar-toggle';
export default function AppLayout() {
  return (
    <SidebarProvider
      className="h-screen flex min-h-0"
      style={{ '--sidebar-width': '17rem' } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarHeader />
      <SidebarInset className="overflow-hidden">
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
    <div
      className={cn(
        'fixed  top-2.25 w-[17rem] gap-2 transition-all ease-linear z-9999 flex px-4 pr-2.25  items-center pl-22',
        open && 'justify-between',
        isFullscreen && 'pl-4'
      )}
    >
      <Clawpilot className="h-6 w-8"/>
      <SidebarToggle />
    </div>
  );
};
