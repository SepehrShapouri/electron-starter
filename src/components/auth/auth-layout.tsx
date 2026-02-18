import { Outlet } from '@tanstack/react-router';

export default function AuthLayout() {
  return (
    <div className="bg-background-2 flex min-h-svh h-full flex-col items-center justify-center gap-6 p-2">
      <div className="size-full flex flex-col items-center justify-center bg-background rounded-md">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
