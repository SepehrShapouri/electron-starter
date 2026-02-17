"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Variants
// ─────────────────────────────────────────────────────────────

const separatorVariants = cva("bg-border shrink-0", {
  variants: {
    orientation: {
      horizontal: "w-full",
      vertical: "h-full",
    },
    size: {
      sm: "data-[orientation=horizontal]:h-[0.5px] data-[orientation=vertical]:w-[0.5px]",
      default:
        "data-[orientation=horizontal]:h-px data-[orientation=vertical]:w-px",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    size: "default",
  },
});

type SeparatorProps = React.ComponentProps<typeof SeparatorPrimitive.Root> &
  VariantProps<typeof separatorVariants>;

function Separator({
  className,
  orientation = "horizontal",
  size = "default",
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(separatorVariants({ orientation, size }), className)}
      {...props}
    />
  );
}

export { Separator };
