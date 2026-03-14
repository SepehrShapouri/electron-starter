import * as React from "react";
import CentralIcon, { type CentralIconProps } from "@central-icons-react/all";
import {
  centralIconsMetadata,
  type CentralIconName,
} from "@central-icons-react/all/icons";

import { cn } from "@/lib/utils";

export type AppIconName = CentralIconName;

export type AppIconProps = Omit<Partial<CentralIconProps>, "name"> & {
  name: AppIconName | string;
  fallbackName?: AppIconName;
  iconFill?: CentralIconProps["fill"];
};

function isCentralIconName(name: string): name is AppIconName {
  return name in centralIconsMetadata;
}

export function AppIcon({
  name,
  fallbackName,
  join = "round",
  fill,
  iconFill,
  radius = "2",
  stroke = "2",
  className,
  ...props
}: AppIconProps) {
  const resolvedName = isCentralIconName(name) ? name : fallbackName;

  if (!resolvedName) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[AppIcon] Unknown icon name: \"${name}\"`);
    }
    return null;
  }

  return (
    <CentralIcon
      name={resolvedName}
      join={join}
      fill={iconFill ?? fill ?? "outlined"}
      radius={radius}
      stroke={stroke}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}
