import IconBubble4 from '@/components/icons/IconBubble4.svg';
import IconCalendarClock from '@/components/icons/IconCalendarClock.svg';
import IconIntegrations from '@/components/icons/IconIntegrations.svg';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useAppUpdate } from '@/hooks/use-app-update';
import { Link, useRouterState } from '@tanstack/react-router';
import { ArrowDownToLine, Loader2, Puzzle, Settings } from 'lucide-react';
import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card';
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = useRouterState({
    select: state => state.location.pathname,
  });
  const { updateState, installUpdate } = useAppUpdate();
  const [isInstallingUpdate, setIsInstallingUpdate] = React.useState(false);
  const [dismissedVersion, setDismissedVersion] = React.useState<string | null>(
    null
  );

  const availableVersion = updateState?.availableVersion ?? null;
  const hasUpdate =
    updateState?.status === 'available' || updateState?.status === 'downloaded';

  const isDismissed = Boolean(
    dismissedVersion &&
    availableVersion &&
    dismissedVersion === availableVersion
  );

  React.useEffect(() => {
    if (!availableVersion) {
      setDismissedVersion(null);
    }
  }, [availableVersion]);

  const handleInstallUpdate = async () => {
    setIsInstallingUpdate(true);
    await installUpdate();
    setIsInstallingUpdate(false);
  };

  const isJarvisActive = pathname === '/app';
  const isChannelsActive = pathname.startsWith('/app/channels');
  const isIntegrationsActive = pathname.startsWith('/app/integrations');
  const isSkillsActive = pathname.startsWith('/app/skills');
  const isScheduledActive = pathname.startsWith('/app/scheduled');
  const isSettingsActive = pathname.startsWith('/app/settings');
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
            {/* <SidebarMenuItem>
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
            </SidebarMenuItem> */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Scheduled"
                className="h-9"
                isActive={isScheduledActive}
              >
                <Link to="/app/scheduled">
                  <IconCalendarClock className="h-4 w-4" />
                  <span>Scheduled</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Channels"
                className="h-9"
                isActive={isChannelsActive}
              >
                <Link to="/app/channels">
                  <IconIntegrations className="h-4 w-4" />
                  <span>Channels</span>
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
                  <Puzzle className="h-4 w-4" />
                  <span>Integrations</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Settings"
                className="h-9"
                isActive={isSettingsActive}
              >
                <Link to="/app/settings">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-0">
        {hasUpdate && !isDismissed && updateState.status === 'downloaded' ? (
          <Card className="gap-2 py-4 shadow-none">
            <CardHeader className="px-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">New update</CardTitle>
                {availableVersion ? (
                  <Badge
                    variant="secondaryAccent"
                    size="sm"
                    className="rounded-xs"
                  >
                    v{availableVersion}
                  </Badge>
                ) : null}
              </div>
              <CardDescription>
                A new version of Clawpilot is available!
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Ready to install. The app will restart once you confirm.
              </p>
              <Button
                size="sm"
                onClick={handleInstallUpdate}
                disabled={isInstallingUpdate}
              >
                {isInstallingUpdate ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                )}
                {isInstallingUpdate ? 'Installing...' : 'Install now'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

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
