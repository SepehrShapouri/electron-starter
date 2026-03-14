import { AppIcon, type AppIconProps } from "@/components/app-icon";
import { cn } from "@/lib/utils";

type SpinnerProps = Omit<AppIconProps, "fallbackName" | "name">;

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <AppIcon
      name="IconLoader"
      fallbackName="IconCircle"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
