"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { aiElementShowcases } from "@/lib/ai-element-showcases";
import { componentShowcases } from "@/lib/component-showcases";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const allComponentRoutes = componentShowcases.map((showcase) => ({
  title: showcase.name,
  href: showcase.href,
  icon: "IconComponents" as const,
}));

const allAIElementRoutes = aiElementShowcases.map((showcase) => ({
  title: showcase.name,
  href: showcase.href,
  icon: "IconComponents" as const,
}));

const mainRoutes = [
  { title: "Home", href: "/", icon: "IconHome" },
  { title: "Components", href: "/components", icon: "IconComponents" },
  { title: "AI Elements", href: "/ai-elements", icon: "IconComponents" },
  { title: "Variables", href: "/variables", icon: "IconComponents" },
  { title: "Icons", href: "/icons", icon: "IconComponents" },
] satisfies Array<{ title: string; href: string; icon: AppIconName }>;

export function AppSidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-1 text-sm font-semibold">DS</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Home &amp; Components</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainRoutes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton
                    isActive={pathname === route.href}
                    render={<Link href={route.href} />}
                  >
                    <AppIcon name={route.icon} className="size-4" />
                    <span>{route.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Collapsible defaultOpen={false}>
            <SidebarGroupLabel
              render={
                <CollapsibleTrigger className="group hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center">
                  <span>All Components</span>
                  <AppIcon
                    name="IconChevronDownMedium"
                    className="ml-auto size-4 opacity-70 transition-transform group-aria-expanded:rotate-180"
                  />
                </CollapsibleTrigger>
              }
            />
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {allComponentRoutes.map((route) => (
                    <SidebarMenuItem key={route.href}>
                      <SidebarMenuButton
                        isActive={pathname === route.href}
                        render={<Link href={route.href} />}
                      >
                        <AppIcon name={route.icon} className="size-4" />
                        <span>{route.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
        <SidebarGroup>
          <Collapsible defaultOpen={false}>
            <SidebarGroupLabel
              render={
                <CollapsibleTrigger className="group hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center">
                  <span>AI Element Routes</span>
                  <AppIcon
                    name="IconChevronDownMedium"
                    className="ml-auto size-4 opacity-70 transition-transform group-aria-expanded:rotate-180"
                  />
                </CollapsibleTrigger>
              }
            />
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {allAIElementRoutes.map((route) => (
                    <SidebarMenuItem key={route.href}>
                      <SidebarMenuButton
                        isActive={pathname === route.href}
                        render={<Link href={route.href} />}
                      >
                        <AppIcon name={route.icon} className="size-4" />
                        <span>{route.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(isDark ? "light" : "dark")}
              tooltip={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mounted && isDark ? (
                <AppIcon name="IconSun" className="size-4" />
              ) : (
                <AppIcon name="IconMoon" className="size-4" />
              )}
              <span>{mounted && isDark ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
