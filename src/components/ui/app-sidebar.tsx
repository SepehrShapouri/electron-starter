import IconBlocks from '@/components/icons/IconBlocks.svg';
import IconBubble4 from '@/components/icons/IconBubble4.svg';
import IconCalendarClock from '@/components/icons/IconCalendarClock.svg';
import IconIntegrations from '@/components/icons/IconIntegrations.svg';
import { useAppUpdate } from '@/hooks/use-app-update';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useMatchRoute } from '@tanstack/react-router';
import {
  ArrowDownToLine,
  Download,
  Loader2,
  RefreshCcwDot,
  Sparkles,
} from 'lucide-react';
import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card';
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const matchRoute = useMatchRoute();
  const { updateState, checkForUpdates, installUpdate } = useAppUpdate();
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

  const isJarvisActive = Boolean(matchRoute({ to: '/app', fuzzy: false }));
  const isIntegrationsActive = Boolean(
    matchRoute({ to: '/app/integrations', fuzzy: true })
  );
  const isSkillsActive = Boolean(
    matchRoute({ to: '/app/skills', fuzzy: true })
  );
  const isScheduledActive = Boolean(
    matchRoute({ to: '/app/scheduled', fuzzy: true })
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
        {hasUpdate && !isDismissed ? (
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
                {updateState?.status === 'downloaded'
                  ? 'Ready to install. The app will restart once you confirm.'
                  : 'Downloading in the background. You can keep working.'}
              </p>
              {updateState?.status === 'downloaded' ? (
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
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void checkForUpdates();
                  }}
                >
                  <RefreshCcwDot className="h-3.5 w-3.5" />
                  Check status
                </Button>
              )}
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
