"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sliderTrackVariants = cva(
  "bg-muted rounded-full data-horizontal:w-full data-vertical:h-full data-vertical:w-full relative grow overflow-hidden select-none",
  {
    variants: {
      size: {
        xs: "data-horizontal:h-0.5 data-vertical:w-0.5",
        sm: "data-horizontal:h-1 data-vertical:w-1",
        default: "data-horizontal:h-1.5 data-vertical:w-1.5",
        lg: "data-horizontal:h-2 data-vertical:w-2",
        xl: "data-horizontal:h-2.5 data-vertical:w-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const sliderThumbVariants = cva(
  "border-ring ring-ring/50 relative rounded-full border bg-white transition-[color,box-shadow] after:absolute hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        xs: "size-2.5 after:-inset-2",
        sm: "size-3 after:-inset-2",
        default: "size-3.5 after:-inset-2 border-2",
        lg: "size-4 after:-inset-2 border-2",
        xl: "size-5 after:-inset-2.5 border-3",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type SliderProps = SliderPrimitive.Root.Props &
  VariantProps<typeof sliderTrackVariants> &
  VariantProps<typeof sliderThumbVariants>;

function Slider({
  className,
  defaultValue,
  value,
  size = "default",
  min = 0,
  max = 100,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(sliderTrackVariants({ size }))}
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className={cn(sliderThumbVariants({ size }))}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider, sliderTrackVariants, sliderThumbVariants };
