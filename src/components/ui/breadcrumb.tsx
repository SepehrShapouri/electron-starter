import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";

import { AppIcon } from "@/components/app-icon";
import { cn } from "@/lib/utils";

type BreadcrumbSize = "sm" | "default" | "lg";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn(className)}
      {...props}
    />
  );
}

function BreadcrumbList({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"ol"> & {
  size?: BreadcrumbSize;
}) {
  return (
    <ol
      data-slot="breadcrumb-list"
      data-size={size}
      className={cn(
        "text-muted-foreground group/breadcrumb flex flex-wrap items-center wrap-break-word",
        "data-[size=sm]:gap-1 data-[size=sm]:text-xs",
        "data-[size=default]:gap-1.5 data-[size=default]:text-sm",
        "data-[size=lg]:gap-2 data-[size=lg]:text-base",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn(
        "inline-flex items-center",
        "group-data-[size=sm]/breadcrumb:gap-0.5 group-data-[size=default]/breadcrumb:gap-1 group-data-[size=lg]/breadcrumb:gap-1.5",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbLink({
  className,
  render,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn("hover:text-foreground transition-colors", className),
      },
      props,
    ),
    render,
    state: {
      slot: "breadcrumb-link",
    },
  });
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn(
        "[&>svg]:size-3.5",
        "group-data-[size=sm]/breadcrumb:[&>svg]:size-3 group-data-[size=lg]/breadcrumb:[&>svg]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? (
        <AppIcon name="IconChevronRightMedium" fallbackName="IconCircle" />
      )}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center",
        "size-5 [&>svg]:size-4",
        "group-data-[size=sm]/breadcrumb:size-4 group-data-[size=sm]/breadcrumb:[&>svg]:size-3",
        "group-data-[size=lg]/breadcrumb:size-6 group-data-[size=lg]/breadcrumb:[&>svg]:size-5",
        className,
      )}
      {...props}
    >
      <AppIcon name="IconDotGrid1x3Horizontal" fallbackName="IconCircle" />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
