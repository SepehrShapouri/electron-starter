import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { AppSidebar } from '../ui/app-sidebar';
import { Outlet } from '@tanstack/react-router';
import { SidebarToggle } from './sidebar-toggle';
import whiteLogo from '../../assets/clawpilot-full-white.png';
import blackLogo from '../../assets/clawpilot-full-dark.png';
import { cn } from '@/lib/utils';
import { useFullscreen } from '@/hooks/use-fullscreen';
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
      <img src={whiteLogo} className="h-4 hidden dark:block  " alt="" />
      <img src={blackLogo} className="h-4 dark:hidden " alt="" />
      <SidebarToggle />
    </div>
  );
};
