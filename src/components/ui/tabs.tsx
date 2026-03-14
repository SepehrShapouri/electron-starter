import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "gap-2 group/tabs flex data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "rounded-lg p-[3px] group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        soft: "bg-transparent",
        line: "gap-1 bg-transparent rounded-none",
      },
      size: {
        default: "group-data-horizontal/tabs:h-8",
        xs: "group-data-horizontal/tabs:h-6 rounded-md p-0.5",
        sm: "group-data-horizontal/tabs:h-7 rounded-md p-0.5",
        lg: "group-data-horizontal/tabs:h-9",
        xl: "group-data-horizontal/tabs:h-10",
        xxl: "group-data-horizontal/tabs:h-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const tabsTriggerVariants = cva(
  "gap-1.5 rounded-md border border-transparent font-medium group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none group-data-[variant=soft]/tabs-list:data-active:shadow-none [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground relative inline-flex flex-1 items-center justify-center whitespace-nowrap transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 group-data-[size=default]/tabs-list:h-[calc(100%-1px)] group-data-[size=default]/tabs-list:px-2.5 group-data-[size=default]/tabs-list:text-sm group-data-[size=default]/tabs-list:has-data-[icon=inline-end]:pr-2 group-data-[size=default]/tabs-list:has-data-[icon=inline-start]:pl-2 group-data-[size=xs]/tabs-list:h-[calc(100%-1px)] group-data-[size=xs]/tabs-list:rounded-sm group-data-[size=xs]/tabs-list:px-2 group-data-[size=xs]/tabs-list:text-xs group-data-[size=xs]/tabs-list:has-data-[icon=inline-end]:pr-1.5 group-data-[size=xs]/tabs-list:has-data-[icon=inline-start]:pl-1.5 group-data-[size=xs]/tabs-list:[&_svg:not([class*='size-'])]:size-3 group-data-[size=sm]/tabs-list:h-[calc(100%-1px)] group-data-[size=sm]/tabs-list:px-2.5 group-data-[size=sm]/tabs-list:text-[0.8rem] group-data-[size=sm]/tabs-list:has-data-[icon=inline-end]:pr-1.5 group-data-[size=sm]/tabs-list:has-data-[icon=inline-start]:pl-1.5 group-data-[size=sm]/tabs-list:[&_svg:not([class*='size-'])]:size-3.5 group-data-[size=lg]/tabs-list:h-[calc(100%-1px)] group-data-[size=lg]/tabs-list:px-2.5 group-data-[size=lg]/tabs-list:text-sm group-data-[size=lg]/tabs-list:has-data-[icon=inline-end]:pr-3 group-data-[size=lg]/tabs-list:has-data-[icon=inline-start]:pl-3 group-data-[size=xl]/tabs-list:h-[calc(100%-1px)] group-data-[size=xl]/tabs-list:rounded-lg group-data-[size=xl]/tabs-list:px-3 group-data-[size=xl]/tabs-list:text-sm group-data-[size=xl]/tabs-list:has-data-[icon=inline-end]:pr-3.5 group-data-[size=xl]/tabs-list:has-data-[icon=inline-start]:pl-3.5 group-data-[size=xxl]/tabs-list:h-[calc(100%-1px)] group-data-[size=xxl]/tabs-list:rounded-xl group-data-[size=xxl]/tabs-list:px-3.5 group-data-[size=xxl]/tabs-list:text-base group-data-[size=xxl]/tabs-list:has-data-[icon=inline-end]:pr-4 group-data-[size=xxl]/tabs-list:has-data-[icon=inline-start]:pl-4"
)

function TabsList({
  className,
  variant = "default",
  size = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      data-size={size}
      className={cn(tabsListVariants({ variant, size }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        tabsTriggerVariants(),
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "group-data-[variant=soft]/tabs-list:data-active:bg-accent group-data-[variant=soft]/tabs-list:data-active:text-accent-foreground",
        "group-data-[variant=default]/tabs-list:data-active:bg-background group-data-[variant=default]/tabs-list:dark:data-active:text-foreground group-data-[variant=default]/tabs-list:dark:data-active:border-input group-data-[variant=default]/tabs-list:dark:data-active:bg-input/30",
        "data-active:text-foreground",
        "after:bg-foreground after:absolute after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("text-sm flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants }
