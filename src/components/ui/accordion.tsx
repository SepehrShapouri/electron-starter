"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";

import { AppIcon } from "@/components/app-icon";
import { cn } from "@/lib/utils";

type AccordionTriggerSize = "default" | "xs" | "sm" | "lg" | "xl";

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  size = "default",
  ...props
}: AccordionPrimitive.Trigger.Props & {
  size?: AccordionTriggerSize;
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        data-size={size}
        className={cn(
          "focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground rounded-lg text-left font-medium hover:underline focus-visible:ring-3 **:data-[slot=accordion-trigger-icon]:ml-auto group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
          "data-[size=xs]:py-1.5 data-[size=xs]:text-xs data-[size=xs]:**:data-[slot=accordion-trigger-icon]:size-3",
          "data-[size=sm]:py-2 data-[size=sm]:text-sm data-[size=sm]:**:data-[slot=accordion-trigger-icon]:size-3.5",
          "data-[size=default]:py-2.5 data-[size=default]:text-sm data-[size=default]:**:data-[slot=accordion-trigger-icon]:size-4",
          "data-[size=lg]:py-3 data-[size=lg]:text-base data-[size=lg]:**:data-[slot=accordion-trigger-icon]:size-5",
          "data-[size=xl]:py-3.5 data-[size=xl]:text-base data-[size=xl]:**:data-[slot=accordion-trigger-icon]:size-5",
          className,
        )}
        {...props}
      >
        {children}
        <AppIcon
          data-slot="accordion-trigger-icon"
          name="IconChevronDownMedium"
          className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <AppIcon
          data-slot="accordion-trigger-icon"
          name="IconChevronDownMedium"
          className="pointer-events-none hidden shrink-0 rotate-180 group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="data-open:animate-accordion-down data-closed:animate-accordion-up text-sm overflow-hidden"
      {...props}
    >
      <div
        className={cn(
          "pt-0 pb-2.5 [&_a]:hover:text-foreground h-(--accordion-panel-height) data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
