"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Context to propagate variant
// ─────────────────────────────────────────────────────────────

const TabsVariantContext = React.createContext<{
  variant?: TabsVariant;
} | null>(null);

// ─────────────────────────────────────────────────────────────
// Variant configs for List and Trigger
// ─────────────────────────────────────────────────────────────

const tabsListVariants = cva(
  "inline-flex w-fit items-center justify-center  gap-0.5 ",
  {
    variants: {
      variant: {
        default: "",
        soft: "bg-neutral-a3 rounded-lg p-[3px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const tabsTriggerVariants = cva(
  "inline-flex flex-1 items-center rounded-lg justify-center gap-1.5 border border-transparent font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        sm: "px-2 py-1 text-sm h-[calc(100%-1px)] rounded-md",
        default: "px-3 py-1.5 text-sm h-[calc(100%-1px)]",
        lg: "px-4 py-2 text-sm h-[calc(100%-1px)]",
      },
      variant: {
        default:
          "dark:data-[state=active]:bg-neutral-a3 data-[state=active]:bg-background data-[state=active]:shadow-xs border border-transparent dark:data-[state=active]:border-transparent data-[state=active]:border-border hover:bg-neutral-a4 focus-visible:border-ring focus-visible:ring-ring/50",
        soft: "data-[state=active]:bg-neutral-a5 hover:bg-neutral-a4 focus-visible:border-ring focus-visible:ring-ring/50",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

type TabsVariant = VariantProps<typeof tabsTriggerVariants>["variant"];
type TabsSize = VariantProps<typeof tabsTriggerVariants>["size"];

// ─────────────────────────────────────────────────────────────
// Tabs Root
// ─────────────────────────────────────────────────────────────

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// TabsList with context provider
// ─────────────────────────────────────────────────────────────

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: TabsVariant;
}) {
  return (
    <TabsVariantContext.Provider value={{ variant }}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(tabsListVariants({ variant }), className)}
        {...props}
      />
    </TabsVariantContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// TabsTrigger with context-aware variant
// ─────────────────────────────────────────────────────────────

function TabsTrigger({
  className,
  size = "default",
  variant: variantProp,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  size?: TabsSize;
  variant?: TabsVariant;
}) {
  const context = React.useContext(TabsVariantContext);
  const variant = variantProp ?? context?.variant ?? "default";

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ size, variant }), className)}
      {...props}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// TabsContent
// ─────────────────────────────────────────────────────────────

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
