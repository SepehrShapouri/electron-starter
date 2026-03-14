"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";

import { AppIcon } from "@/components/app-icon";
import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "default" | "lg" | "xl";
type AvatarFallbackVariant = "default" | "icon";

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: AvatarSize;
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "rounded-full after:rounded-full after:border-border group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border-[0.5px] after:mix-blend-darken dark:after:mix-blend-lighten",
        "data-[size=xs]:size-5 data-[size=sm]:size-6 data-[size=default]:size-8 data-[size=lg]:size-10 data-[size=xl]:size-12",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "rounded-full aspect-square size-full object-cover",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  children,
  variant = "default",
  ...props
}: AvatarPrimitive.Fallback.Props & {
  variant?: AvatarFallbackVariant;
}) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      data-variant={variant}
      className={cn(
        "bg-neutral-3 text-muted-foreground rounded-full flex size-full items-center justify-center",
        "text-sm group-data-[size=xs]/avatar:text-[0.625rem] group-data-[size=sm]/avatar:text-xs group-data-[size=lg]/avatar:text-base group-data-[size=xl]/avatar:text-lg",
        className,
      )}
      {...props}
    >
      {variant === "icon" ? (
        <AppIcon
          name="IconPeople"
          fallbackName="IconCircle"
          iconFill="filled"
          className="size-4 group-data-[size=xs]/avatar:size-2.5 group-data-[size=sm]/avatar:size-3 group-data-[size=lg]/avatar:size-5 group-data-[size=xl]/avatar:size-6"
        />
      ) : (
        children
      )}
    </AvatarPrimitive.Fallback>
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none",
        "group-data-[size=xs]/avatar:size-1.5 group-data-[size=xs]/avatar:[&>svg]:hidden",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        "group-data-[size=xl]/avatar:size-3.5 group-data-[size=xl]/avatar:[&>svg]:size-2.5",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "*:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "bg-neutral-3 text-muted-foreground rounded-full text-sm [&>svg]:size-4 ring-background relative flex shrink-0 items-center justify-center ring-2",
        "size-8 group-has-data-[size=xs]/avatar-group:size-5 group-has-data-[size=sm]/avatar-group:size-6 group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=xl]/avatar-group:size-12",
        "group-has-data-[size=xs]/avatar-group:[&>svg]:size-2.5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=xl]/avatar-group:[&>svg]:size-6",
        className,
      )}
      {...props}
    />
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
};
