import { LEGAL_URLS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { type MouseEvent } from 'react';
import { openExternalUrl } from '@/lib/open-external-url';

type LegalLinksProps = {
  className?: string;
};

const handleExternalClick = (url: string) => {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    void openExternalUrl(url);
  };
};

export function LegalLinks({ className }: LegalLinksProps) {
  return (
    <span className={cn('inline', className)}>
      <a
        href={LEGAL_URLS.termsOfService}
        onClick={handleExternalClick(LEGAL_URLS.termsOfService)}
        className="text-foreground/80 transition-colors hover:text-foreground"
      >
        Terms of Service
      </a>
      {', '}
      <a
        href={LEGAL_URLS.privacyPolicy}
        onClick={handleExternalClick(LEGAL_URLS.privacyPolicy)}
        className="text-foreground/80 transition-colors hover:text-foreground"
      >
        Privacy Policy
      </a>
      {', and '}
      <a
        href={LEGAL_URLS.eula}
        onClick={handleExternalClick(LEGAL_URLS.eula)}
        className="text-foreground/80 transition-colors hover:text-foreground"
      >
        EULA
      </a>
    </span>
  );
}
