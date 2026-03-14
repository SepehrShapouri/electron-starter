"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-red-9 hover:bg-red-10 text-white focus-visible:border-red-10 focus-visible:ring-red-a4",
        "destructive-soft":
          "bg-red-a3 hover:bg-red-a4 text-red-11 focus-visible:border-red-a4 focus-visible:ring-red-a4",
        blue: "bg-blue-9 hover:bg-blue-10 text-white focus-visible:border-blue-10 focus-visible:ring-blue-a4",
        "blue-soft":
          "bg-blue-a3 hover:bg-blue-a4 text-blue-11 focus-visible:border-blue-a4 focus-visible:ring-blue-a4",
        green:
          "bg-green-9 hover:bg-green-10 text-white focus-visible:border-green-10 focus-visible:ring-green-a4",
        "green-soft":
          "bg-green-a3 hover:bg-green-a4 text-green-11 focus-visible:border-green-a4 focus-visible:ring-green-a4",
        yellow:
          "bg-yellow-9 hover:bg-yellow-10 text-black focus-visible:border-yellow-10 focus-visible:ring-yellow-a4",
        "yellow-soft":
          "bg-yellow-a3 hover:bg-yellow-a4 text-yellow-11 focus-visible:border-yellow-a4 focus-visible:ring-yellow-a4",
        purple:
          "bg-purple-9 hover:bg-purple-10 text-white focus-visible:border-purple-10 focus-visible:ring-purple-a4",
        "purple-soft":
          "bg-purple-a3 hover:bg-purple-a4 text-purple-11 focus-visible:border-purple-a4 focus-visible:ring-purple-a4",
        beige:
          "bg-beige-9 hover:bg-beige-10 text-white focus-visible:border-beige-10 focus-visible:ring-beige-a4",
        "beige-soft":
          "bg-beige-a3 hover:bg-beige-a4 text-beige-11 focus-visible:border-beige-a4 focus-visible:ring-beige-a4",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-sm px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-md px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xl: "h-10 gap-1.5 rounded-lg px-3 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xxl: "h-12 gap-1.5 rounded-xl px-3.5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-sm in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-md in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
        "icon-xl": "size-10 [&_svg:not([class*='size-'])]:size-5 rounded-lg",
        "icon-xxl": "size-12 [&_svg:not([class*='size-'])]:size-6 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
