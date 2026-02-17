import { useTheme } from '@/components/theme-provider';
import { Moon, Sun } from 'lucide-react';
import { flushSync } from 'react-dom';
import { DropdownMenuItem } from './ui/dropdown-menu';

type ThemeSelection = 'light' | 'dark';

function getClipKeyframes(): [string, string] {
  return ['inset(0 0 100% 0)', 'inset(0 0 0 0)'];
}

function getSystemEffectiveTheme(): ThemeSelection {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const getNextTheme = (): ThemeSelection => {
    const current = theme === 'system' ? getSystemEffectiveTheme() : theme;
    return current === 'light' ? 'dark' : 'light';
  };

  const toggleTheme = async () => {
    const nextTheme = getNextTheme();

    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const resolvedTheme = nextTheme;

    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);

        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolvedTheme);
      });
    }).ready;

    const [fromClip, toClip] = getClipKeyframes();

    void document.documentElement.animate(
      { clipPath: [fromClip, toClip] },
      {
        duration: 700,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      }
    ).finished;
  };

  const getIcon = () => {
    const effectiveTheme =
      theme === 'system' ? getSystemEffectiveTheme() : theme;
    return effectiveTheme === 'dark' ? (
      <Moon className="h-[1.2rem] w-[1.2rem]" />
    ) : (
      <Sun className="h-[1.2rem] w-[1.2rem]" />
    );
  };

  return (
    <>
      <DropdownMenuItem
        onSelect={event => {
          event.preventDefault();
          void toggleTheme();
        }}
      >
        {getIcon()}
        Toggle theme
      </DropdownMenuItem>
      <style>{`::view-transition-old(root), ::view-transition-new(root){animation:none;mix-blend-mode:normal;}`}</style>
    </>
  );
}
