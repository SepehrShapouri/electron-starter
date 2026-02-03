import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '../ui/app-sidebar';
import { Outlet } from '@tanstack/react-router';
import { TitleBar } from '../title-bar';

export default function AppLayout() {
  return (
    <div className="h-screen flex flex-col [--header-height:calc(--spacing(12))]">
      <SidebarProvider className="flex min-h-0 flex-1 flex-col">
        <TitleBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
