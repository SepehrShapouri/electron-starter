"use client";

import type { AppIconProps } from "@/components/app-icon";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";

import { AppIcon } from "@/components/app-icon";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CheckpointProps = HTMLAttributes<HTMLDivElement>;

export const Checkpoint = ({
  className,
  children,
  ...props
}: CheckpointProps) => (
  <div
    className={cn(
      "flex items-center gap-0.5 overflow-hidden text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
    <Separator />
  </div>
);

export type CheckpointIconProps = Omit<AppIconProps, "name"> & {
  name?: AppIconProps["name"];
  children?: ReactNode;
};

export const CheckpointIcon = ({
  className,
  children,
  ...props
}: CheckpointIconProps) =>
  children ?? (
    <AppIcon
      name="IconBookmark"
      fallbackName="IconCircle"
      className={cn("size-4 shrink-0", className)}
      iconFill="filled"
      {...props}
    />
  );

export type CheckpointTriggerProps = ComponentProps<typeof Button> & {
  tooltip?: string;
};

export const CheckpointTrigger = ({
  children,
  variant = "ghost",
  size = "sm",
  tooltip,
  ...props
}: CheckpointTriggerProps) =>
  tooltip ? (
    <Tooltip>
      <TooltipTrigger
        render={<Button size={size} type="button" variant={variant} {...props} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent align="start" side="bottom">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  ) : (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
    </Button>
  );
