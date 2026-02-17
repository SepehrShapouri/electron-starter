'use client';

import { NavUser } from '@/components/nav-user';
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
import { authApi } from '@/lib/auth-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Link,
  useMatchRoute,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router';
import { Bot, Grid, Wrench } from 'lucide-react';
import * as React from 'react';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useRouteContext({ from: '/app' });
  const matchRoute = useMatchRoute();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const signOutMutation = useMutation({
    mutationFn: authApi.signOut,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate({ to: '/auth/login' });
    },
  });

  const user = {
    name: session?.user?.name ?? session?.name ?? 'Account',
    email: session?.user?.email ?? session?.email ?? '',
    avatar:
      session?.user?.avatar ??
      session?.user?.avatarUrl ??
      session?.avatar ??
      '',
  };

  const isJarvisActive = Boolean(matchRoute({ to: '/app', fuzzy: false }));
  const isIntegrationsActive = Boolean(
    matchRoute({ to: '/app/integrations', fuzzy: true })
  );
  const isSkillsActive = Boolean(
    matchRoute({ to: '/app/skills', fuzzy: true })
  );

  return (
    <Sidebar variant="sidebar" {...props}>
      
      <SidebarHeader
        className="h-[52px] p-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <SidebarContent className="gap-0">
        {/* Navigation */}
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
                  <Bot className="h-4 w-4" />
                  <span>Jarvis</span>
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
                  <Grid className="h-4 w-4" />
                  <span>Integrations</span>
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
                  <Wrench className="h-4 w-4" />
                  <span>Skills</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <NavUser
          user={user}
          onSignOut={() => signOutMutation.mutate()}
          isSigningOut={signOutMutation.isPending}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
