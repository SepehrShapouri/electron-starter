"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { aiElementShowcases } from "@/lib/ai-element-showcases";
import { componentShowcases } from "@/lib/component-showcases";
import { Input } from "@/components/ui/input";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

type SearchItem = {
  name: string;
  href: string;
  description: string;
  type: "component" | "ai-element";
};

const searchableRoutes: SearchItem[] = [
  ...componentShowcases.map((showcase) => ({
    name: showcase.name,
    href: showcase.href,
    description: showcase.description,
    type: "component" as const,
  })),
  ...aiElementShowcases.map((showcase) => ({
    name: showcase.name,
    href: showcase.href,
    description: showcase.description,
    type: "ai-element" as const,
  })),
];

const defaultSuggestions: SearchItem[] = [
  { name: "All Components", href: "/components", description: "Component index", type: "component" as const },
  { name: "All AI Elements", href: "/ai-elements", description: "AI element index", type: "ai-element" as const },
  ...componentShowcases.slice(0, 4).map((showcase) => ({
    name: showcase.name,
    href: showcase.href,
    description: showcase.description,
    type: "component" as const,
  })),
  ...aiElementShowcases.slice(0, 2).map((showcase) => ({
    name: showcase.name,
    href: showcase.href,
    description: showcase.description,
    type: "ai-element" as const,
  })),
].slice(0, 8);

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchResults = React.useMemo(() => {
    if (!normalizedQuery) {
      return { components: [], aiElements: [] } as const;
    }

    const matching = searchableRoutes.filter((route) => {
      return (
        route.name.toLowerCase().includes(normalizedQuery) ||
        route.href.toLowerCase().includes(normalizedQuery) ||
        route.description.toLowerCase().includes(normalizedQuery)
      );
    });

    return {
      components: matching
        .filter((route) => route.type === "component")
        .slice(0, 8),
      aiElements: matching
        .filter((route) => route.type === "ai-element")
        .slice(0, 8),
    } as const;
  }, [normalizedQuery]);

  React.useEffect(() => {
    setIsSearchOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex items-center gap-3">
            <SidebarTrigger />
            <div ref={searchContainerRef} className="relative ml-auto w-full max-w-md">
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search components and AI elements..."
                className="h-9 w-full"
                aria-label="Search components and AI elements"
              />
              {isSearchOpen ? (
                <div className="absolute top-full z-50 mt-2 max-h-[28rem] w-full overflow-auto rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
                  {!normalizedQuery ? (
                    <div>
                      <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Suggestions
                      </p>
                      <ul className="space-y-1">
                        {defaultSuggestions.map((route) => (
                          <li key={`${route.type}-${route.href}`}>
                            <Link
                              href={route.href}
                              className="hover:bg-accent hover:text-accent-foreground block rounded-sm px-2 py-2"
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery("");
                              }}
                            >
                              <p className="text-sm font-medium">{route.name}</p>
                              <p className="text-xs text-muted-foreground">{route.href}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {normalizedQuery &&
                  searchResults.components.length === 0 &&
                  searchResults.aiElements.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">No matching routes.</p>
                  ) : null}

                  {normalizedQuery && searchResults.components.length > 0 ? (
                    <div className="mb-1">
                      <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Components
                      </p>
                      <ul className="space-y-1">
                        {searchResults.components.map((route) => (
                          <li key={route.href}>
                            <Link
                              href={route.href}
                              className="hover:bg-accent hover:text-accent-foreground block rounded-sm px-2 py-2"
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery("");
                              }}
                            >
                              <p className="text-sm font-medium">{route.name}</p>
                              <p className="text-xs text-muted-foreground">{route.href}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {normalizedQuery && searchResults.aiElements.length > 0 ? (
                    <div>
                      <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        AI Elements
                      </p>
                      <ul className="space-y-1">
                        {searchResults.aiElements.map((route) => (
                          <li key={route.href}>
                            <Link
                              href={route.href}
                              className="hover:bg-accent hover:text-accent-foreground block rounded-sm px-2 py-2"
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery("");
                              }}
                            >
                              <p className="text-sm font-medium">{route.name}</p>
                              <p className="text-xs text-muted-foreground">{route.href}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
