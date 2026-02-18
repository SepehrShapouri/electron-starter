import MagicLinkPage from '@/pages/magic-link';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/login-magic-link')({
  component: LoginMagicLink,
});

function LoginMagicLink() {
  return <MagicLinkPage mode="signin" />;
}
