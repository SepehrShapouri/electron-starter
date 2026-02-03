import { createFileRoute } from '@tanstack/react-router';
import ResetPassword from '@/pages/reset-password';

export const Route = createFileRoute('/auth/reset')({
  component: ResetPassword,
});
