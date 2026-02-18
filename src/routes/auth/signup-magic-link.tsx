import MagicLinkPage from '@/pages/magic-link';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/signup-magic-link')({
  component: SignupMagicLink,
});

function SignupMagicLink() {
  return <MagicLinkPage mode="signup" />;
}
