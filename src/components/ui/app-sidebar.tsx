'use client';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { authApi } from '@/lib/auth-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import { Bot, Grid, LifeBuoy, Send, Wrench } from 'lucide-react';
import * as React from 'react';

const data = {
  navMain: [
    {
      title: 'Jarvis',
      url: '/app/',
      icon: Bot,
    },
    {
      title: 'Integrations',
      url: '/app/integrations',
      icon: Grid,
    },
    {
      title: 'Skills',
      url: '/app/skills',
      icon: Wrench,
    },
  ],
  navSecondary: [
    {
      title: 'Support',
      url: '#',
      icon: LifeBuoy,
    },
    {
      title: 'Feedback',
      url: '#',
      icon: Send,
    },
  ],
  projects: [],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useRouteContext({ from: '/app' });
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

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={user}
          onSignOut={() => signOutMutation.mutate()}
          isSigningOut={signOutMutation.isPending}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
