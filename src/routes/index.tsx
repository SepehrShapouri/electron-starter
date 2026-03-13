import { createFileRoute } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';

const DOC_LINKS = [
  {
    href: 'https://www.electronjs.org/docs/latest',
    label: 'Electron',
  },
  {
    href: 'https://www.electronforge.io/',
    label: 'Forge',
  },
  {
    href: 'https://tanstack.com/router/latest',
    label: 'Router',
  },
  {
    href: 'https://www.electronjs.org/docs/latest/tutorial/updates',
    label: 'Updates',
  },
] as const;

function openExternalLink(url: string) {
  if (window.electronAPI) {
    return window.electronAPI.openExternalUrl(url);
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return Promise.resolve();
}

function StarterHomeRoute() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Electron Update Starter
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Single-route boilerplate with updater wiring. Replace this page and
          start building.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {DOC_LINKS.map(link => (
            <button
              key={link.href}
              type="button"
              onClick={() => {
                void openExternalLink(link.href);
              }}
              className="inline-flex items-center gap-1 text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute('/')({
  component: StarterHomeRoute,
});
