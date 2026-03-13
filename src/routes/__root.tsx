import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

function ErrorBoundary({ error }: { error: Error }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-red-500/20 bg-white/90 p-8 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur dark:border-red-400/20 dark:bg-slate-950/85">
        <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-red-700 dark:text-red-200">
          Route Error
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          The starter shell hit an unexpected error.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {error.message || 'Unknown error'}
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRoute({
  component: () => <Outlet />,
  errorComponent: ErrorBoundary,
});
