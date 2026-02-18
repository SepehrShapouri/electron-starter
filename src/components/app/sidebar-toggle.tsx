'use client';

import { useSidebar } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';
import { Button } from '../ui/button';

export function SidebarToggle() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      size="iconSm"
      onClick={toggleSidebar}
      variant="ghost"
    >
      <Menu />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
