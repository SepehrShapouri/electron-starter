"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonFancyVariants = cva(
  "focus-visible:ring-ring/50 aria-invalid:ring-destructive/40 aria-invalid:border-destructive/50 rounded-lg border !border-transparent text-sm font-medium focus-visible:!border-transparent focus-visible:ring-3 aria-invalid:ring-3 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none relative overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-white/20 after:opacity-0 after:transition-opacity hover:after:opacity-100",
  {
    variants: {
      variant: {
        default:
          "text-white bg-[hsl(0_0%_4%)] after:bg-white/2 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.15),inset_0_1px_0_0_rgba(255,255,255,0.23),0_8px_20px_-5px_rgba(0,0,0,0.40),0_0_0_1px_var(--black,#000)]",
        light:
          "text-[#1F2937] bg-[hsl(0_0%_99%)] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_#EBEFF5,0_10px_40px_-8px_rgba(0,0,0,0.08)]",
        destructive:
          "text-[#7F1D1D] bg-[#FFF1F0] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_#FFD9D5,0_10px_40px_-8px_rgba(0,0,0,0.08)]",
        primary:
          "text-[#3F2A73] bg-[var(--primary-3,#F3EEFF)] dark:bg-[#F3EEFF] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_var(--primary-5,#E3D5FF),0_10px_40px_-8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_#E3D5FF,0_10px_40px_-8px_rgba(0,0,0,0.08)]",
        accent:
          "text-[#1E3A5F] bg-[var(--accent-3,#EEF6FF)] dark:bg-[#EEF6FF] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_var(--accent-5,#D5E8FF),0_10px_40px_-8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_#D5E8FF,0_10px_40px_-8px_rgba(0,0,0,0.08)]",
        green:
          "text-[#185B38] bg-[var(--green-3,#E7F9EE)] dark:bg-[#E7F9EE] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_var(--green-5,#C6EFD6),0_10px_40px_-8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_#C6EFD6,0_10px_40px_-8px_rgba(0,0,0,0.08)]",
        orange:
          "text-[#7A4A06] bg-[#FFF7E8] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_#FFE1AD,0_10px_40px_-8px_rgba(0,0,0,0.08)]",
        beige:
          "text-[#5B4930] bg-[var(--beige-3,#F6F1E7)] dark:bg-[#F6F1E7] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_var(--beige-5,#E8DDCA),0_10px_40px_-8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.60),inset_0_1px_0_0_rgba(255,255,255,0.80),0_0_0_1px_#E8DDCA,0_10px_40px_-8px_rgba(0,0,0,0.08)]",
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

function ButtonFancy({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonFancyVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonFancyVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { ButtonFancy, buttonFancyVariants };
