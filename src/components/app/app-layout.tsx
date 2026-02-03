import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '../ui/app-sidebar';
import { Outlet } from '@tanstack/react-router';
import { SidebarToggle } from './sidebar-toggle';

export default function AppLayout() {
  return (
    <SidebarProvider
      className="h-screen flex min-h-0"
      style={{ '--sidebar-width': '17rem' } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarToggle />
      <SidebarInset className="overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
