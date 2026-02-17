import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-12 text-neutral-1 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-neutral-5",
        destructive:
          "text-white bg-red-9 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-white/80",
        primary:
          "text-white bg-primary-9 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-white/80",
        accent:
          "text-white bg-accent-9 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-white/80",
        success:
          "text-white bg-green-9 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-white/80",
        warning:
          "text-black bg-yellow-9 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-black/80",
        secondary:
          "bg-neutral-a3 text-neutral-12 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-neutral-11",
        secondaryDestructive:
          "text-red-12 bg-red-a3 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-red-12/80",
        secondaryPrimary:
          "text-primary-12 bg-primary-a3 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-primary-12/80",
        secondaryAccent:
          "text-accent-12 bg-accent-a3 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-primary-12/80",
        secondarySuccess:
          "text-green-12 bg-green-a3 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-green-12/80",
        secondaryWarning:
          "text-yellow-12 bg-yellow-a3 border-none [&>svg]:text-current *:data-[slot=alert-description]:text-yellow-12/80",
        outline:
          "bg-transparent text-neutral-12 [&>svg]:text-current *:data-[slot=alert-description]:text-neutral-11",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        " col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
