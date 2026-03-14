"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { AppIcon } from "@/components/app-icon";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <AppIcon
            name="IconCircleCheck"
            fallbackName="IconCheckmark2Small"
            className="size-4"
          />
        ),
        info: (
          <AppIcon
            name="IconCircleInfo"
            fallbackName="IconCircle"
            className="size-4"
          />
        ),
        warning: (
          <AppIcon
            name="IconExclamationTriangle"
            fallbackName="IconCircle"
            className="size-4"
          />
        ),
        error: (
          <AppIcon
            name="IconCircleX"
            fallbackName="IconCrossMedium"
            className="size-4"
          />
        ),
        loading: (
          <AppIcon
            name="IconLoader"
            fallbackName="IconCircle"
            className="size-4 animate-spin"
          />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--modal)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
