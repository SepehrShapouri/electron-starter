"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { AppIcon } from "@/components/app-icon";

const Combobox = ComboboxPrimitive.Root;
type ComboboxInputSize = "default" | "xs" | "sm" | "lg" | "xl" | "xxl";

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <AppIcon
        name="IconChevronDownMedium"
        className="text-muted-foreground size-4 pointer-events-none"
      />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <AppIcon name="IconCrossMedium" className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  inputSize = "default",
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  inputSize?: ComboboxInputSize;
  showTrigger?: boolean;
  showClear?: boolean;
}) {
  const buttonSize =
    inputSize === "xs" || inputSize === "sm" ? "icon-xs" : "icon-sm";

  return (
    <InputGroup
      data-size={inputSize}
      className={cn(
        "w-auto data-[size=xs]:h-6 data-[size=xs]:rounded-sm data-[size=sm]:h-7 data-[size=sm]:rounded-md data-[size=default]:h-8 data-[size=default]:rounded-lg data-[size=lg]:h-9 data-[size=lg]:rounded-lg data-[size=xl]:h-10 data-[size=xl]:rounded-lg data-[size=xxl]:h-12 data-[size=xxl]:rounded-xl",
        className,
      )}
    >
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} size={inputSize} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size={buttonSize}
            variant="ghost"
            render={<ComboboxTrigger />}
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          />
        )}
        {showClear && (
          <ComboboxClear
            render={<InputGroupButton variant="ghost" size={buttonSize} />}
            disabled={disabled}
          />
        )}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:border-input/30 overflow-hidden rounded-lg shadow-fancy ring-1 duration-100 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:shadow-none data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) data-[chips=true]:min-w-(--anchor-width)",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 p-1 data-empty:p-0 overflow-y-auto overscroll-contain",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <AppIcon name="IconCheckmark2Small" className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  );
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/combobox-content:flex",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function ComboboxChips({
  className,
  inputSize = "default",
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props & {
    inputSize?: ComboboxInputSize;
  }) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      data-size={inputSize}
      className={cn(
        "dark:bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive dark:has-aria-invalid:border-destructive/50 group/combobox-chips flex min-h-8 flex-wrap items-center gap-1 rounded-lg border bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:ring-3 has-aria-invalid:ring-3 has-data-[slot=combobox-chip]:px-1 data-[size=xs]:min-h-6 data-[size=xs]:rounded-sm data-[size=xs]:px-2 data-[size=xs]:py-0.5 data-[size=xs]:text-xs data-[size=sm]:min-h-7 data-[size=sm]:rounded-md data-[size=sm]:py-0.5 data-[size=sm]:text-[0.8rem] data-[size=default]:min-h-8 data-[size=default]:rounded-lg data-[size=default]:py-1 data-[size=default]:text-sm data-[size=lg]:min-h-9 data-[size=lg]:rounded-lg data-[size=lg]:py-1.5 data-[size=lg]:text-sm data-[size=xl]:min-h-10 data-[size=xl]:rounded-lg data-[size=xl]:px-3 data-[size=xl]:py-1.5 data-[size=xl]:text-sm data-[size=xxl]:min-h-12 data-[size=xxl]:rounded-xl data-[size=xxl]:px-3.5 data-[size=xxl]:py-2 data-[size=xxl]:text-base",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  inputSize = "default",
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
  inputSize?: ComboboxInputSize;
}) {
  const chipRemoveSize =
    inputSize === "xs" || inputSize === "sm" ? "icon-xs" : "icon-sm";

  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "bg-muted text-foreground flex w-fit items-center justify-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap has-data-[slot=combobox-chip-remove]:pr-0 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 group-data-[size=xs]/combobox-chips:h-4.5 group-data-[size=xs]/combobox-chips:text-[10px] group-data-[size=sm]/combobox-chips:h-5 group-data-[size=sm]/combobox-chips:text-[11px] group-data-[size=default]/combobox-chips:h-[calc(--spacing(5.25))] group-data-[size=lg]/combobox-chips:h-6 group-data-[size=lg]/combobox-chips:text-xs group-data-[size=xl]/combobox-chips:h-6.5 group-data-[size=xl]/combobox-chips:text-sm group-data-[size=xxl]/combobox-chips:h-7 group-data-[size=xxl]/combobox-chips:px-2 group-data-[size=xxl]/combobox-chips:text-sm",
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size={chipRemoveSize} />}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <AppIcon name="IconCrossMedium" className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  inputSize = "default",
  ...props
}: ComboboxPrimitive.Input.Props & {
  inputSize?: ComboboxInputSize;
}) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn(
        "min-w-16 flex-1 outline-none data-[size=xs]:text-xs data-[size=sm]:text-[0.8rem] data-[size=default]:text-sm data-[size=lg]:text-sm data-[size=xl]:text-sm data-[size=xxl]:text-base",
        className,
      )}
      data-size={inputSize}
      {...props}
    />
  );
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  type ComboboxInputSize,
  useComboboxAnchor,
};
