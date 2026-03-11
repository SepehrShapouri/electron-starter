import { BadgeCheck, CreditCard, LogOut } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authApi } from '@/lib/auth-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import { ThemeToggle } from './theme-toggle';

const getInitials = (value?: string | null) => {
  if (!value) {
    return '?';
  }

  return value
    .split(' ')
    .map(part => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export function NavUser() {
  const { session } = useRouteContext({ from: '/app' });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const signOutMutation = useMutation({
    mutationFn: authApi.signOut,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate({ to: '/auth/welcome' });
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
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage
            src={user.avatar ?? undefined}
            alt={user.name ?? 'User'}
          />
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage
                src={user.avatar ?? undefined}
                alt={user.name ?? 'User'}
              />
              <AvatarFallback className="rounded-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {user.name ?? 'Account'}
              </span>
              {user.email ? (
                <span className="truncate text-xs">{user.email}</span>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <ThemeToggle />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signOutMutation.isPending}
          onSelect={event => {
            event.preventDefault();
            signOutMutation.mutate();
          }}
        >
          <LogOut />
          {signOutMutation.isPending ? 'Signing out' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
