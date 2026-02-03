'use client';

import { useSidebar } from '@/components/ui/sidebar';
import { PanelLeft } from 'lucide-react';
import { Button } from '../ui/button';

export function SidebarToggle() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      size="icon-sm"
      onClick={toggleSidebar}
      className="fixed top-[10px] left-[78px] z-[9999]"
      variant="ghost"
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
