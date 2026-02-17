import IconBlocks from '@/components/icons/IconBlocks.svg';
import IconBubble4 from '@/components/icons/IconBubble4.svg';
import IconCalendarClock from '@/components/icons/IconCalendarClock.svg';
import IconIntegrations from '@/components/icons/IconIntegrations.svg';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link, useMatchRoute } from '@tanstack/react-router';
import * as React from 'react';
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const matchRoute = useMatchRoute();

  const isJarvisActive = Boolean(matchRoute({ to: '/app', fuzzy: false }));
  const isIntegrationsActive = Boolean(
    matchRoute({ to: '/app/integrations', fuzzy: true })
  );
  const isSkillsActive = Boolean(
    matchRoute({ to: '/app/skills', fuzzy: true })
  );

  return (
    <Sidebar variant="sidebar" {...props} className="border-r-0!">
      <SidebarHeader
        className="h-[52px] p-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <SidebarContent className="gap-0">
        <SidebarGroup className="px-3 py-2">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Jarvis"
                className="h-9"
                isActive={isJarvisActive}
              >
                <Link to="/app">
                  <IconBubble4 className="h-4 w-4" />
                  <span>Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Skills"
                className="h-9"
                isActive={isSkillsActive}
              >
                <Link to="/app/skills">
                  <IconBlocks className="h-4 w-4" />
                  <span>Skills</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Skills"
                className="h-9"
                isActive={isSkillsActive}
              >
                <Link to="/app/skills">
                  <IconCalendarClock className="h-4 w-4" />
                  <span>Scheduled</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Integrations"
                className="h-9"
                isActive={isIntegrationsActive}
              >
                <Link to="/app/integrations">
                  <IconIntegrations className="h-4 w-4" />
                  <span>Tools</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-0">
        <SidebarMenuItem className="list-none">
          <SidebarMenuButton>
            <a href={`mailto:support@clawpilot.ai`}>
              <span>Report a bug</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="list-none">
          <SidebarMenuButton>
            <a href={`mailto:support@clawpilot.ai`}>
              <span>Contact support</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  );
}
